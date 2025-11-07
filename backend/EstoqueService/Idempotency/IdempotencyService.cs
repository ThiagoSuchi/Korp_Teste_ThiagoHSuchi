using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Caching.Memory;

namespace EstoqueService.Idempotency;

public interface IIdempotencyService
{
    Task<IResult> ExecuteAsync(
        string? idempotencyKey,
        HttpContext httpContext,
        Func<CancellationToken, Task<IResult>> action,
        CancellationToken cancellationToken);
}

internal sealed class IdempotencyService : IIdempotencyService
{
    private static readonly TimeSpan EntryTtl = TimeSpan.FromMinutes(10);

    private readonly IMemoryCache _cache;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public IdempotencyService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public async Task<IResult> ExecuteAsync(
        string? idempotencyKey,
        HttpContext httpContext,
        Func<CancellationToken, Task<IResult>> action,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return await action(cancellationToken).ConfigureAwait(false);
        }

        var composedKey = ComposeCacheKey(httpContext, idempotencyKey);

        if (_cache.TryGetValue<IdempotencyRecord>(composedKey, out var existingRecord) && existingRecord is not null)
        {
            return existingRecord.ToResult();
        }

        var gate = _locks.GetOrAdd(composedKey, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);

        try
        {
            if (_cache.TryGetValue<IdempotencyRecord>(composedKey, out existingRecord) && existingRecord is not null)
            {
                return existingRecord.ToResult();
            }

            var result = await action(cancellationToken).ConfigureAwait(false);
            var record = IdempotencyRecord.FromResult(result);
            _cache.Set(composedKey, record, EntryTtl);
            return result;
        }
        finally
        {
            gate.Release();
            _locks.TryRemove(composedKey, out _);
        }
    }

    private static string ComposeCacheKey(HttpContext context, string key)
    {
        return $"{context.Request.Method}:{context.Request.Path}:{key}";
    }
}

internal sealed record IdempotencyRecord(int StatusCode, object? Value, string? ContentType)
{
    public static IdempotencyRecord FromResult(IResult result)
    {
        var statusCode = (result as IStatusCodeHttpResult)?.StatusCode ?? StatusCodes.Status200OK;
        var value = (result as IValueHttpResult)?.Value;
        var contentType = (result as IContentTypeHttpResult)?.ContentType;
        return new IdempotencyRecord(statusCode, value, contentType);
    }

    public IResult ToResult() => new StoredResult(StatusCode, Value, ContentType);
}

internal sealed class StoredResult : IResult, IStatusCodeHttpResult, IValueHttpResult, IContentTypeHttpResult
{
    public StoredResult(int statusCode, object? value, string? contentType)
    {
        StatusCode = statusCode;
        Value = value;
        ContentType = contentType;
    }

    public int? StatusCode { get; }

    public object? Value { get; }

    public string? ContentType { get; }

    public async Task ExecuteAsync(HttpContext httpContext)
    {
        httpContext.Response.StatusCode = StatusCode ?? StatusCodes.Status200OK;

        if (!string.IsNullOrWhiteSpace(ContentType))
        {
            httpContext.Response.ContentType = ContentType;
        }

        if (Value is null)
        {
            return;
        }

        if (Value is IResult nestedResult)
        {
            await nestedResult.ExecuteAsync(httpContext).ConfigureAwait(false);
            return;
        }

        await httpContext.Response.WriteAsJsonAsync(Value, cancellationToken: httpContext.RequestAborted).ConfigureAwait(false);
    }

}

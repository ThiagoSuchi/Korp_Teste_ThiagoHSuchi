import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';

import { extrairMensagemErro } from '@shared/utils/helpers';

@Injectable({ providedIn: 'root' })
export class ToastService {
  success(message: string, description?: string): void {
    toast.success(message, description ? { description } : undefined);
  }

  error(message: string, description?: string): void {
    toast.error(message, description ? { description } : undefined);
  }

  info(message: string, description?: string): void {
    toast(message, description ? { description } : undefined);
  }

  errorFromRequest(error: unknown, fallback: string, title = 'Não foi possível concluir a operação'): void {
    const resolved = extrairMensagemErro(error) ?? fallback;
    this.error(title, resolved);
  }
}

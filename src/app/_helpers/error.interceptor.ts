import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((err: any) => {
                if ([401, 403].includes(err.status) && this.accountService.accountValue) {
                    const isAuthEndpoint = request.url.includes('/accounts/validate-reset-token')
    || request.url.includes('/accounts/reset-password')
    || request.url.includes('/accounts/refresh-token')
    || request.url.includes('/accounts/register')        // ✅ add
    || request.url.includes('/accounts/authenticate')    // ✅ add
    || request.url.includes('/accounts/verify-email')    // ✅ add
    || request.url.includes('/accounts/forgot-password'); // ✅ add

                    if (!isAuthEndpoint) {
                        this.accountService.logout();
                    }
                }

                // ✅ Always extract to a plain string
                const error = err?.error?.message || err?.message || err?.statusText || 'An error occurred';
                
                return throwError(() => error);
            })
        );
    }
}
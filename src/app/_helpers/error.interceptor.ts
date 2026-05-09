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
            catchError((err: { status: number; error: { message: any; }; statusText: any; }) => {
                if ([401, 403].includes(err.status) && this.accountService.accountValue) {
                    this.accountService.logout();
                }

                const error = (err && err.error && err.error.message) || err.statusText;
                console.error(err);
                return throwError(() => error);
            })
        );
    }
}
import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, materialize, dematerialize } from 'rxjs/operators';
import { AlertService } from '@app/_services';
import { Role } from '@app/_models';

const accountsKey = 'angular-15-signup-verification-boilerplate-accounts';
let accounts: any[] = JSON.parse(localStorage.getItem(accountsKey) ?? '[]') || [];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;
        const alertService = this.alertService;

        return handleRoute().pipe(
            materialize(),
            delay(500),
            dematerialize()
        );

        function handleRoute(): Observable<HttpEvent<any>> {
                accounts = JSON.parse(localStorage.getItem(accountsKey) ?? '[]') || [];

            switch (true) {
                case url.endsWith('/accounts/authenticate') && method === 'POST':
                    return authenticate();
                case url.endsWith('/accounts/refresh-token') && method === 'POST':
                    return refreshToken();
                case url.endsWith('/accounts/revoke-token') && method === 'POST':
                    return revokeToken();
                case url.endsWith('/accounts/register') && method === 'POST':
                    return register();
                case url.endsWith('/accounts/verify-email') && method === 'POST':
                    return verifyEmail();
                case url.endsWith('/accounts/forgot-password') && method === 'POST':
                    return forgotPassword();
                case url.endsWith('/accounts/validate-reset-token') && method === 'POST':
                    return validateResetToken();
                case url.endsWith('/accounts/reset-password') && method === 'POST':
                    return resetPassword();
                case url.endsWith('/accounts') && method === 'GET':
                    return getAccounts();
                case !!url.match(/\/accounts\/\d+$/) && method === 'GET':
                    return getAccountById();
                case url.endsWith('/accounts') && method === 'POST':
                    return createAccount();
                case !!url.match(/\/accounts\/\d+$/) && method === 'PUT':
                    return updateAccount();
                case !!url.match(/\/accounts\/\d+$/) && method === 'DELETE':
                    return deleteAccount();
                default:
                    return next.handle(request);
            }
        }

        function authenticate() {
            const { email, password } = body;
            const account = accounts.find(x => x.email === email && x.password === password && x.isVerified);
            if (!account) return error('Email or password is incorrect');
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function refreshToken() {
            const refreshToken = getRefreshToken();
            if (!refreshToken) return unauthorized();
            const account = accounts.find((x: any) => x.refreshTokens.includes(refreshToken));
            if (!account) return unauthorized();
            account.refreshTokens = account.refreshTokens.filter((x: any) => x !== refreshToken);
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function revokeToken() {
            if (!isAuthenticated()) return unauthorized();
            const refreshToken = getRefreshToken();
            const account = accounts.find((x: any) => x.refreshTokens.includes(refreshToken));
            if (!account) return unauthorized();
            account.refreshTokens = account.refreshTokens.filter((x: any) => x !== refreshToken);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok();
        }

        function register() {
            const params = body;
            if (accounts.find((x: any) => x.email === params.email)) {
                alertService.info(`
                    <h4>Email Already Registered</h4>
                    <p>Your email <strong>${params.email}</strong> is already registered.</p>
                    <p>Please <a href="${location.origin}/account/forgot-password">click here</a> to reset your password.</p>
                    <p>The fake backend displayed this "email" so you can test without an email server. A real backend would send a real email.</p>
                `, { autoClose: false });
                return ok();
            }

            const account: any = { ...params };
            account.id = newAccountId();
            account.dateCreated = new Date().toISOString();
            account.role = accounts.length === 0 ? Role.Admin : Role.User;
            account.verificationToken = new Date().getTime().toString();
            account.isVerified = false;
            account.refreshTokens = [];
            delete account.confirmPassword;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            const verifyUrl = `${location.origin}/account/verify-email?token=${account.verificationToken}`;
            alertService.info(`
                <h4>Registration Successful</h4>
                <p>Thanks for registering!</p>
                <p>Please click the below link to verify your email address:</p>
                <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                <p>The fake backend displayed this "email" so you can test without an email server. A real backend would send a real email.</p>
            `, { autoClose: false });
            return ok();
        }

        function verifyEmail() {
            const { token } = body;
            const account = accounts.find((x: any) => x.verificationToken && x.verificationToken === token);
            if (!account) return error('Verification failed');
            account.isVerified = true;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok();
        }

        function forgotPassword() {
            const { email } = body;
            const account = accounts.find((x: any) => x.email === email);
            if (!account) return ok();
            account.resetToken = new Date().getTime().toString();
            account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            const resetUrl = `${location.origin}/account/reset-password?token=${account.resetToken}`;
            alertService.info(`
                <h4>Reset Password Email</h4>
                <p>Please click the below link to reset your password:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>The fake backend displayed this "email" so you can test without an email server. A real backend would send a real email.</p>
            `, { autoClose: false });
            return ok();
        }

        function validateResetToken() {
            const { token } = body;
            const account = accounts.find((x: any) =>
                x.resetToken === token &&
                new Date() < new Date(x.resetTokenExpires)
            );
            if (!account) return error('Invalid token');
            return ok();
        }

        function resetPassword() {
            const { token, password } = body;
            const account = accounts.find((x: any) =>
                x.resetToken === token &&
                new Date() < new Date(x.resetTokenExpires)
            );
            if (!account) return error('Invalid token');
            account.password = password;
            delete account.resetToken;
            delete account.resetTokenExpires;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok();
        }

        function getAccounts() {
            if (!isAuthorized(Role.Admin)) return unauthorized();
            return ok(accounts.map((x: any) => basicDetails(x)));
        }

        function getAccountById() {
            if (!isAuthenticated()) return unauthorized();
            const account = accounts.find((x: any) => x.id === idFromUrl());
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }
            return ok(basicDetails(account));
        }

        function createAccount() {
            if (!isAuthorized(Role.Admin)) return unauthorized();
            const params = body;
            if (accounts.find((x: any) => x.email === params.email)) {
                return error(`Email ${params.email} is already registered`);
            }
            const account: any = { ...params };
            account.id = newAccountId();
            account.dateCreated = new Date().toISOString();
            account.isVerified = true;
            account.refreshTokens = [];
            delete account.confirmPassword;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok();
        }

        function updateAccount() {
            if (!isAuthenticated()) return unauthorized();
            let params = body;
            let account = accounts.find((x: any) => x.id === idFromUrl());
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }
            if (!params.password) {
                delete params.password;
            }
            Object.assign(account, params);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok(basicDetails(account));
        }

        function deleteAccount() {
            if (!isAuthenticated()) return unauthorized();
            let account = accounts.find((x: any) => x.id === idFromUrl());
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }
            accounts = accounts.filter((x: any) => x.id !== idFromUrl());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            return ok();
        }

        function ok(body?: any) {
            return of(new HttpResponse({ status: 200, body }))
                .pipe(delay(500));
        }

        function error(message: string) {
            return throwError(() => ({ error: { message } }))
                .pipe(materialize(), delay(500), dematerialize());
        }

        function unauthorized() {
            return throwError(() => ({ status: 401, error: { message: 'Unauthorized' } }))
                .pipe(materialize(), delay(500), dematerialize());
        }

        function basicDetails(account: any) {
            const { id, title, firstName, lastName, email, role, dateCreated, isVerified } = account;
            return { id, title, firstName, lastName, email, role, dateCreated, isVerified };
        }

        function isAuthenticated() {
            return !!currentAccount();
        }

        function isAuthorized(role: any) {
            const account = currentAccount();
            if (!account) return false;
            return account.role === role;
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function newAccountId() {
            return accounts.length ? Math.max(...accounts.map((x: any) => x.id)) + 1 : 1;
        }

        function currentAccount() {
            const authHeader = headers.get('Authorization');
            if (!authHeader?.startsWith('Bearer fake-jwt-token')) return;
            const jwtToken = JSON.parse(atob(authHeader.split('.')[1]));
            const tokenExpired = Date.now() > (jwtToken.exp * 1000);
            if (tokenExpired) return;
            const account = accounts.find((x: any) => x.id === jwtToken.id);
            return account;
        }

        function generateJwtToken(account: any) {
            const tokenPayload = {
                exp: Math.round(new Date(Date.now() + 15 * 60 * 1000).getTime() / 1000),
                id: account.id
            };
            return `fake-jwt-token.${btoa(JSON.stringify(tokenPayload))}`;
        }

        function generateRefreshToken() {
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `fakeRefreshToken=; expires=${expires}; path=/`;
            return 'fake-refresh-token';
        }

        function getRefreshToken() {
            return (document.cookie.split(';').find(x => x.includes('fakeRefreshToken')) || '=').split('=')[1];
        }
    }
}

export const fakeBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};
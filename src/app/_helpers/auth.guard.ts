import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AccountService } from '@app/_services';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: AccountService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const account = this.accountService.accountValue;
    console.log('AUTH GUARD - account:', account);
    console.log('AUTH GUARD - url:', state.url);
    
    if (account) {
        if (route.data['roles'] && !route.data['roles'].includes(account.role)) {
            this.router.navigate(['/']);
            return false;
        }
        return true;
    }

    this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
}
}
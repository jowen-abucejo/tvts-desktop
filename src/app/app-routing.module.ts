import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AutoLoginGuard } from './guards/auto-login.guard';
import { IntroGuard } from './guards/intro.guard';
import { SuGuard } from './guards/su.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
    canLoad: [IntroGuard, AutoLoginGuard],
  },
  {
    path: 'intro',
    loadChildren: () =>
      import('./pages/intro/intro.module').then((m) => m.IntroPageModule),
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home.module').then((m) => m.HomePageModule),
    canLoad: [AuthGuard],
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('./su/pages/settings/settings.module').then(
        (m) => m.SettingsPageModule
      ),
    canLoad: [SuGuard],
  },
  {
    path: 'account-settings',
    loadChildren: () =>
      import('./pages/account-settings/account-settings.module').then(
        (m) => m.AccountSettingsPageModule
      ),
    canLoad: [AuthGuard],
  },  {
    path: 'tickets',
    loadChildren: () => import('./pages/tickets/tickets.module').then( m => m.TicketsPageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}

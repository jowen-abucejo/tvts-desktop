import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViolationsPage } from './violations.page';

const routes: Routes = [
  {
    path: '',
    component: ViolationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViolationsPageRoutingModule {}

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TicketInputsPage } from './ticket-inputs.page';

const routes: Routes = [
  {
    path: '',
    component: TicketInputsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TicketInputsPageRoutingModule {}

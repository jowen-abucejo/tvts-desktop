import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TicketInputsPageRoutingModule } from './ticket-inputs-routing.module';

import { TicketInputsPage } from './ticket-inputs.page';
import { DataTablesModule } from 'angular-datatables';
import { SharedModule } from 'src/app/modules/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TicketInputsPageRoutingModule,
    ReactiveFormsModule,
    DataTablesModule,
    SharedModule,
  ],
  declarations: [TicketInputsPage],
})
export class TicketInputsPageModule {}

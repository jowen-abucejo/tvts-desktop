import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PaymentsPageRoutingModule } from './payments-routing.module';

import { PaymentsPage } from './payments.page';
import { DataTablesModule } from 'angular-datatables';
import { SharedModule } from '../../modules/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PaymentsPageRoutingModule,
    ReactiveFormsModule,
    DataTablesModule,
    SharedModule,
  ],
  declarations: [PaymentsPage],
})
export class PaymentsPageModule {}

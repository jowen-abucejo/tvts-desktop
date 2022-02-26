import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViolationsPageRoutingModule } from './violations-routing.module';

import { ViolationsPage } from './violations.page';
import { DataTablesModule } from 'angular-datatables';
import { SharedModule } from '../../modules/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViolationsPageRoutingModule,
    ReactiveFormsModule,
    DataTablesModule,
    SharedModule,
  ],
  declarations: [ViolationsPage],
})
export class ViolationsPageModule {}

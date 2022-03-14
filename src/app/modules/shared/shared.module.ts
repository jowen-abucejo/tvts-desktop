import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomInputComponent } from './custom-input/custom-input.component';
import { IonicModule } from '@ionic/angular';
import { CustomFooterComponent } from './custom-footer/custom-footer.component';
import { PopoverComponent } from './popover/popover.component';
import { TicketFormModalComponent } from './ticket-form-modal/ticket-form-modal.component';
import { ViolationFormModalComponent } from './violation-form-modal/violation-form-modal.component';
import { PaymentFormModalComponent } from './payment-form-modal/payment-form-modal.component';
import { UserFormModalComponent } from './user-form-modal/user-form-modal.component';
import { ExtraInputFormModalComponent } from './extra-input-form-modal/extra-input-form-modal.component';

@NgModule({
  declarations: [
    CustomInputComponent,
    CustomFooterComponent,
    PopoverComponent,
    TicketFormModalComponent,
    ViolationFormModalComponent,
    PaymentFormModalComponent,
    UserFormModalComponent,
    ExtraInputFormModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule.forRoot(),
  ],
  exports: [
    CustomInputComponent,
    CustomFooterComponent,
    PopoverComponent,
    TicketFormModalComponent,
    ViolationFormModalComponent,
    PaymentFormModalComponent,
    UserFormModalComponent,
    ExtraInputFormModalComponent,
  ],
})
export class SharedModule {}

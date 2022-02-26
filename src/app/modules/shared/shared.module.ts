import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomInputComponent } from './custom-input/custom-input.component';
import { IonicModule } from '@ionic/angular';
import { CustomFooterComponent } from './custom-footer/custom-footer.component';
import { PopoverComponent } from './popover/popover.component';
import { FormModalComponent } from './form-modal/form-modal.component';

@NgModule({
  declarations: [
    CustomInputComponent,
    CustomFooterComponent,
    PopoverComponent,
    FormModalComponent,
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
    FormModalComponent,
  ],
})
export class SharedModule {}

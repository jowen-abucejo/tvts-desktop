import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomInputComponent } from './custom-input/custom-input.component';
import { IonicModule } from '@ionic/angular';
import { CustomFooterComponent } from './custom-footer/custom-footer.component';

@NgModule({
  declarations: [CustomInputComponent, CustomFooterComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule.forRoot(),
  ],
  exports: [CustomInputComponent, CustomFooterComponent],
})
export class SharedModule {}

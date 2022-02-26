import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
})
export class PopoverComponent implements OnInit {
  @Input() isForm: boolean = false;
  @Input() isContextMenu: boolean = false;
  @Input() parentFormGroup: FormGroup = null;
  @Input() submit_label;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() items: {
    label: string;
    label_position: string;
    input_type: string;
    controller: string;
    placeholder: string;
    callback: () => any;
  }[] = [];
  @Input() buttons: {
    label: string;
    color: string;
    class: string;
    size: string;
    callback: () => any;
  }[] = [];
  @Input() toggles: {
    label: string;
    callback: () => any;
    checked: boolean;
  }[] = [];
  @Input() formSubmitCallback: () => any;

  constructor() {}

  ngOnInit() {}

  submitForm() {
    this.formSubmitCallback();
  }
}

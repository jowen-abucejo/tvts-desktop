import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { StorageService } from '../../../services/storage.service';

export interface ExportPageSetup {
  page_title: string;
  page_subtitle: string;
  page_size: string;
  page_orientation: string;
}

@Component({
  selector: 'app-table-export-menu',
  templateUrl: './table-export-menu.component.html',
  styleUrls: ['./table-export-menu.component.scss'],
})
export class TableExportMenuComponent implements OnInit {
  @Input() content_id: string;
  @Input() menu_id: string;
  @Input() title: string = 'Customize Export';
  @Input() setOpen: boolean;
  @Output() fetchPDFHeader = new EventEmitter<string>();
  @Output() fetchExportSetup = new EventEmitter<ExportPageSetup>();

  pdfHeaderKey: string = 'headerTemplate';
  setupKey: string;
  headerTemplateForm: FormGroup = new FormGroup({
    selectedImage: new FormControl('', Validators.required),
  });

  exportPageSetupForm: FormGroup = new FormGroup({
    page_title: new FormControl('Traffic Violation Ticketing System'),
    page_subtitle: new FormControl(''),
    page_size: new FormControl('A4', Validators.required),
    page_orientation: new FormControl('portrait', Validators.required),
  });
  pdfHeader: string = '';
  preview_data: string = '';
  exportSetup: ExportPageSetup = null;

  constructor(private storage: StorageService) {}

  async ngOnInit() {
    this.pdfHeader = await this.storage
      .get(this.pdfHeaderKey)
      .pipe(take(1))
      .toPromise();
    this.fetchPDFHeader.next(this.pdfHeader);
    this.setupKey = this.content_id + 'PageSetup';
    const rawSetup = await this.storage
      .get(this.setupKey)
      .pipe(take(1))
      .toPromise();
    if (rawSetup) {
      this.exportSetup = JSON.parse(rawSetup);
      this.exportPageSetupForm.controls.page_size.setValue(
        this.exportSetup.page_size
      );
      this.exportPageSetupForm.controls.page_title.setValue(
        this.exportSetup.page_title
      );
      this.exportPageSetupForm.controls.page_subtitle.setValue(
        this.exportSetup.page_subtitle
      );
      this.exportPageSetupForm.controls.page_orientation.setValue(
        this.exportSetup.page_orientation
      );
    } else {
      this.exportSetup = this.exportPageSetupForm.value;
    }

    this.fetchExportSetup.next(this.exportSetup);
  }

  async deleteLogo() {
    await this.storage.remove(this.pdfHeaderKey);
    this.pdfHeader = '';
    this.fetchPDFHeader.next(this.pdfHeader);
  }

  imagePreview(e) {
    const file = (e.target as HTMLInputElement).files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.preview_data = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async saveExportSetting(no_header_template: boolean = false) {
    if (no_header_template) {
      this.exportSetup = this.exportPageSetupForm.value;
      await this.storage.set(this.setupKey, JSON.stringify(this.exportSetup));
      this.fetchExportSetup.next(this.exportSetup);
      this.exportPageSetupForm.markAsPristine();
      return;
    }
    await this.storage.set(this.pdfHeaderKey, this.preview_data);
    this.headerTemplateForm.patchValue({ selectedImage: '' });
    this.pdfHeader = this.preview_data;
    this.fetchPDFHeader.next(this.pdfHeader);
    this.preview_data = '';
  }
}

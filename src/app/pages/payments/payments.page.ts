import { formatDate } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  MenuController,
  ModalController,
  PopoverController,
  ViewWillLeave,
} from '@ionic/angular';
import { DataTableDirective } from 'angular-datatables';
import { take } from 'rxjs/operators';
import { ExportPageSetup } from '../../modules/shared/table-export-menu/table-export-menu.component';
import { PaymentFormModalComponent } from '../../modules/shared/payment-form-modal/payment-form-modal.component';
import { PopoverComponent } from '../../modules/shared/popover/popover.component';
import { ApiService } from '../../services/api.service';
import { StorageService } from '../../services/storage.service';
import { UtilityService } from '../../services/utility.service';
@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
})
export class PaymentsPage implements OnInit, ViewWillLeave {
  hasScrollbar = false;
  private scannedCode = '';
  private scanningInterval;
  private allowScan = true;

  // checks if there's a scrollbar when the user resizes the window or zooms in/out
  @HostListener('window:resize', ['$event'])
  async onResize() {
    await this.checkForScrollbar();
  }

  @HostListener('document:keydown', ['$event'])
  async handleKeyboardEvent(e: KeyboardEvent) {
    if (!this.allowScan) return;
    if (this.scanningInterval) clearInterval(this.scanningInterval);

    if (e.code == 'Enter') {
      if (this.scannedCode) {
        try {
          const decoded = JSON.parse(this.scannedCode);
          const ticket_number = decoded?.number;
          if (ticket_number) await this.searchTicket(ticket_number);
          this.scannedCode = '';
        } catch (e) {}
        return;
      }
    }

    if (e.key != 'Shift') {
      this.scannedCode += e.key;
    }

    this.scanningInterval = setInterval(() => (this.scannedCode = ''), 200);
  }

  async ionViewWillLeave(): Promise<void> {
    if (this.toggleModels && this.toggleModels.length > 0)
      await this.storage
        .set('settings_paymentTableColumns', JSON.stringify(this.toggleModels))
        .catch((res) => {});

    if (this.colReorder && this.colReorder.length > 0)
      await this.storage
        .set(
          'settings_paymentTableColumnsReorder',
          JSON.stringify(this.colReorder)
        )
        .catch((res) => {});
  }

  @ViewChild(DataTableDirective, { static: false })
  datatableElement: DataTableDirective;
  @ViewChild('tableContent', { static: false }) private content: IonContent;
  dateRangeFormGroup: FormGroup = new FormGroup({
    start_date: new FormControl('', Validators.required),
    end_date: new FormControl('', [
      Validators.required,
      this.dateRangeValid('start_date'),
    ]),
  });
  ticketSearchFormGroup: FormGroup;

  current_page: number = 1;
  last_page: number = 1;
  search_phrase = '';
  private old_table_data: any;
  private date_filtered_data: any;
  private old_current_page = 0;
  private old_last_page = 0;
  private max_fetch_date = formatDate(Date.now(), 'medium', 'en');
  private max_date_paginated = '';
  isPaymentsLoaded = false;
  isSearching = false;
  isDateFilterApplied = false;
  toggleModels = [false, true, true, true, true, true];
  colReorder = [];
  cachedColReorder = [];
  pdfHeader: string;
  export_content_id: string = 'paymentTable';
  export_menu_id: string = 'paymentTableExportMenu';
  export_setup: ExportPageSetup;

  /*table structure START HERE*/
  rows = [];
  dtOptions = {
    paging: false,
    responsive: true,
    searching: true,
    ordering: true,
    colReorder: true,
    order: [
      [3, 'desc'],
      [0, 'desc'],
    ],
    autoWidth: true,
    info: false,
    dom: 'rtip',
    processing: false,
    buttons: [
      'colvis',
      {
        extend: 'csv',
        text: 'CSV',
        exportOptions: {
          columns: ':visible',
        },
      },
      {
        extend: 'excel',
        name: 'excel',
        text: 'Excel',
        exportOptions: {
          columns: ':visible',
        },
        title: () => {
          return this.export_setup.page_title;
        },
        messageTop: () => {
          return this.export_setup.page_subtitle;
        },
      },
      {
        extend: 'pdf',
        text: 'PDF',
        exportOptions: {
          columns: ':visible',
        },
        customize: (doc) => {
          doc.pageMargins = [38, 120, 38, 38];
          doc.defaultStyle.alignment = 'center';
          doc.pageOrientation = this.export_setup.page_orientation;
          doc.pageSize = this.export_setup.page_size;
          doc.content[0] = {
            text: this.export_setup.page_title,
            style: { fontSize: 14, bold: true },
            margin: this.export_setup.page_title ? [0, 0, 0, 15] : 0,
          };
          doc.content[1].table.widths = Array(
            doc.content[1].table.body[0].length + 1
          )
            .join('*')
            .split('');
          if (this.export_setup.page_subtitle) {
            doc.content.splice(1, 0, {
              text: this.export_setup.page_subtitle,
              style: {
                fontSize: 11,
                bold: false,
                lineHeight: 1.5,
                alignment: 'left',
              },
              margin: [0, 0, 0, 15],
            });
          }
          doc.images = this.pdfHeader ? { headerTemplate: this.pdfHeader } : {};
          doc.header = {
            columns: [
              this.pdfHeader
                ? {
                    image: 'headerTemplate',
                    height: 50,
                    width: 50,
                    absolutePosition: {
                      x: -240,
                      y: 35,
                    },
                  }
                : '',
              {
                stack: [
                  {
                    columns: [
                      {
                        text: 'Republic of the Philippines',
                        width: '*',
                        style: { fontSize: 11 },
                      },
                    ],
                  },
                  {
                    columns: [
                      {
                        text: 'Province of Cavite',
                        width: '*',
                        style: { fontSize: 11 },
                      },
                    ],
                  },

                  {
                    columns: [
                      {
                        text: 'Municipality of Naic',
                        width: '*',
                        style: { fontSize: 15, bold: true },
                      },
                    ],
                  },
                ],
                width: '*',
              },
            ],
            margin: [this.pdfHeader ? -50 : 0, 38, 0, 38],
          };
          if (!this.pdfHeader) {
            doc.header.columns.splice(0, 1);
          }
        },
        download: 'open',
      },
    ],
    columnDefs: [
      {
        targets: [0],
        visible: false,
      },
      { targets: [1, 2], searchable: true },
      { targets: '_all', searchable: false, visible: true },
      { targets: [5], className: 'dynamic-text-alignment ion-padding-right' },
    ],
  };
  /*table structure END*/

  constructor(
    private apiService: ApiService,
    private utility: UtilityService,
    private popoverController: PopoverController,
    private storage: StorageService,
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private menuController: MenuController
  ) {}

  async ngOnInit() {
    this.dateRangeFormGroup.controls.start_date.valueChanges.subscribe(() => {
      this.dateRangeFormGroup.controls.end_date.updateValueAndValidity();
    });
    await this.initialLoadData();
  }

  private addNewTableData(data: any[]) {
    if (!this.datatableElement) return;
    this.datatableElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.rows.add(data);
      dtInstance.rows().draw();
    });
  }

  async applyDateFilter() {
    this.isSearching = true;
    const loading = await this.utility.createIonLoading();
    loading.present();
    await this.popoverController.dismiss('dateRangeFilter');
    const range = [
      this.dateRangeFormGroup.get('start_date').value,
      this.dateRangeFormGroup.get('end_date').value,
    ];
    const dt = await this.datatableElement.dtInstance;

    if (!this.old_table_data) this.cacheTableData(dt); //if not searching, cache current table data

    dt.rows().remove(); //remove current rows of table
    this.isDateFilterApplied = true;
    this.search_phrase = '';
    this.current_page = 0;
    this.last_page = 0;

    //fetch initial data from server with the given date range and redraw table
    const payments = await this.fetchPayments(1, 50, 'DESC', '', range);
    if (payments && payments.data) {
      this.current_page = payments.meta.current_page;
      this.last_page = payments.meta.last_page;
      let new_data = payments.data;
      let new_rows = this.formatTableData(new_data);
      this.addNewTableData(new_rows);
    }

    //keep fetching all matched payments
    while (this.current_page < this.last_page) {
      await this.loadData(null, 50, 'DESC', range);
    }
    loading.dismiss();
    this.isSearching = false;
  }

  /**
   *
   * @param dt the current table api instance
   */
  private cacheTableData(dt: DataTables.Api) {
    this.old_current_page = this.current_page;
    this.old_last_page = this.last_page;
    this.old_table_data = dt.rows().data();
    this.cachedColReorder = this.colReorder;
  }

  async checkForScrollbar(ignoreSearchingStatus = false) {
    const scrollElement = await this.content.getScrollElement();
    this.hasScrollbar = scrollElement.scrollHeight > scrollElement.clientHeight;
    while (
      !this.isDateFilterApplied &&
      !this.hasScrollbar &&
      this.current_page < this.last_page
    ) {
      if (!this.isSearching || ignoreSearchingStatus) {
        await this.loadData().then(() => {
          this.hasScrollbar =
            scrollElement.scrollHeight > scrollElement.clientHeight;
        });
      }
    }
    return;
  }

  async confirmDeleteTicket(payment_id: number) {
    const options = {
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Enter password',
        },
      ],
      buttons: [
        {
          text: 'Continue',
          cssClass: 'secondary',
          handler: async (credentials) => {
            const operation = `Unable to delete payment!`;
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //delete payment
                    await this.deletePayment(payment_id);
                  } else {
                    const alert = await this.utility.alertMessage(
                      operation,
                      'You enter an incorrect password. Please try again.'
                    );
                    alert.present();
                  }
                },

                //show error message
                async (res) => {
                  await this.utility.alertErrorStatus(res);
                }
              );
            } else {
              const alert = await this.utility.alertMessage(operation);
              alert.present();
            }
          },
        },
      ],
    };
    const alert = await this.utility.alertMessage(
      'Confirm Delete',
      '',
      options
    );
    await alert.present();
  }

  private dateRangeValid(
    from: string // name of the from date control
  ): (AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      return !!control.parent &&
        !!control.parent.value &&
        control.value >= control.parent.controls[from].value
        ? null
        : { isValidRange: false };
    };
  }

  async deletePayment(payment_id) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const status = await this.apiService.deletePayment(payment_id).then(
      (res: any) => {
        return res.deleted;
      },
      async (res) => {
        return false;
      }
    );
    loading.dismiss();
    const feedback = status
      ? 'Payment has been deleted.'
      : 'Payment failed to delete.';
    const alert = await this.utility.alertMessage(feedback);
    this.popoverController.dismiss({
      dismissed: true,
      status: status,
    });
    await alert.present();
  }

  async exportAs(index: number) {
    const dtInstance = <any>await this.datatableElement.dtInstance;
    dtInstance.table().button(index).trigger();
  }

  private async fetchPayments(
    page = 1,
    limit = 10,
    order = 'DESC',
    search = '',
    date_range = null
  ) {
    return this.apiService
      .getPayments(
        page,
        limit,
        order,
        search,
        date_range,
        this.max_fetch_date,
        this.max_date_paginated
      )
      .catch((res) => {
        this.utility.alertErrorStatus(res);
        return null;
      });
  }

  private formatTableData(data: any[]) {
    let to_add = [];
    data.forEach((e) => {
      let new_row = [
        e.id + '',
        (e.ticket_number + '').toUpperCase(),
        e.or_number.toUpperCase(),
        formatDate(new Date(e.date_of_payment), 'MM-dd-yyyy HH:mm:ss a', 'en'),
        e.penalties + '',
        e.total_amount + '',
      ];
      if (this.colReorder && this.colReorder.length > 0) {
        new_row = [
          new_row[this.colReorder[0]],
          new_row[this.colReorder[1]],
          new_row[this.colReorder[2]],
          new_row[this.colReorder[3]],
          new_row[this.colReorder[4]],
          new_row[this.colReorder[5]],
        ];
      }
      to_add.push(new_row);
    });
    return to_add;
  }

  private async initialLoadData() {
    this.isSearching = true;

    const payments = await this.fetchPayments();
    if (payments && payments.data) {
      let new_data = payments.data;
      this.current_page = payments.meta.current_page;
      this.last_page = payments.meta.last_page;
      this.rows = this.formatTableData(new_data);
    }

    this.isPaymentsLoaded = true;

    const raw_data_colVis = await this.storage
      .get('settings_paymentTableColumns')
      .pipe(take(1))
      .toPromise()
      .catch((res) => {
        return null;
      });
    this.toggleModels = JSON.parse(raw_data_colVis) ?? this.toggleModels;

    const raw_data_colReorder = await this.storage
      .get('settings_paymentTableColumnsReorder')
      .pipe(take(1))
      .toPromise()
      .catch((res) => {
        return null;
      });

    this.colReorder = JSON.parse(raw_data_colReorder) ?? null;

    const hidden_columns = this.toggleModels
      .map((v, i) => (!v ? i : -1))
      .filter((v) => v > -1);

    if (this.datatableElement) {
      if (hidden_columns.length > 0) {
        (await this.datatableElement.dtInstance)
          .columns(hidden_columns)
          .visible(false);
      }

      if (this.colReorder && this.colReorder.length > 0) {
        (<any>await this.datatableElement.dtInstance).colReorder.order(
          this.colReorder
        );
      }

      (await this.datatableElement.dtInstance).on(
        'column-reorder',
        async () => {
          this.colReorder = (<any>(
            await this.datatableElement.dtInstance
          )).colReorder.order();
        }
      );
    }

    this.isSearching = false;
    this.checkForScrollbar();
  }

  async loadData(event = null, limit = 10, order = 'DESC', date_range = null) {
    this.isSearching = true;
    const payments = await this.fetchPayments(
      this.current_page + 1,
      limit,
      order,
      this.search_phrase,
      date_range
    );
    if (payments && (payments.data || payments.meta.new_records)) {
      let new_data = payments.data;
      if (payments.meta.new_records && payments.meta.new_records.length > 0) {
        const untracked_records = payments.meta.new_records;
        this.max_fetch_date = untracked_records[0].apprehension_datetime;
        new_data = new_data.concat(untracked_records);
      }
      if (new_data.length > 0) {
        this.current_page = payments.meta.current_page;
        this.last_page = payments.meta.last_page;
        this.max_date_paginated = payments.meta.max_date_paginated;
        let new_rows = this.formatTableData(new_data);
        this.addNewTableData(new_rows);
      }
    }
    if (event) event?.target.complete();
    this.isSearching = false;
  }

  async promptDateFilter(ev) {
    if (this.isDateFilterApplied) {
      this.isDateFilterApplied = false;
      this.date_filtered_data = null;
      await this.resetTable();
      return;
    }

    const componentProps = {
      title: 'Select Date Range',
      subtitle: 'Load all records within the given range.',
      isForm: true,
      parentFormGroup: this.dateRangeFormGroup,
      items: [
        {
          label: 'FROM',
          label_position: 'stacked',
          input_type: 'date',
          controller: 'start_date',
          placeholder: '',
        },
        {
          label: 'TO',
          label_position: 'stacked',
          input_type: 'date',
          controller: 'end_date',
          placeholder: '',
        },
      ],
      submit_label: 'Apply Date Filter',
      formSubmitCallback: () => this.applyDateFilter(),
    };
    const popover = await this.popoverController.create({
      component: PopoverComponent,
      componentProps: componentProps,
      event: ev,
      id: 'dateRangeFilter',
    });
    return await popover.present();
  }

  async promptColVisMenu(ev) {
    const dtInstance = <any>await this.datatableElement.dtInstance;
    this.toggleModels = dtInstance.table().columns().visible().toArray();
    const toggles = [];
    dtInstance.columns().every((index) => {
      if (index > 0) {
        const col = dtInstance.column(index);
        const column = {
          label: col.header().textContent,
          callback: () => {
            this.toggleColumnVisibility(index);
          },
          checked: col.visible(),
        };
        toggles.push(column);
      }
    });
    const componentProps = {
      title: 'Hide or Show Column',
      subtitle: '',
      isForm: false,
      toggles: toggles,
      toggleModels: this.toggleModels,
    };
    const popover = await this.popoverController.create({
      component: PopoverComponent,
      componentProps: componentProps,
      event: ev,
      id: 'colvisMenu',
    });
    return await popover.present();
  }

  async promptTicketSearch() {
    this.ticketSearchFormGroup = this.formBuilder.group({
      ticket_number: ['', [Validators.required]],
    });

    const componentProps = {
      title: 'Enter Ticket Number',
      subtitle: '',
      isForm: true,
      parentFormGroup: this.ticketSearchFormGroup,
      items: [
        {
          label: 'Ticket Number',
          label_position: 'floating',
          input_type: 'text',
          controller: 'ticket_number',
          placeholder: 'Enter ticket number',
        },
      ],

      submit_label: 'Create Payment',
      formSubmitCallback: () => this.searchTicket(),
    };
    const popover = await this.popoverController.create({
      component: PopoverComponent,
      componentProps: componentProps,
      id: 'violatorSearch',
    });
    return await popover.present();
  }

  reloadPage() {
    this.allowScan = true;
    this.current_page = 1;
    this.last_page = 1;
    this.search_phrase = '';
    this.old_table_data = null;
    this.date_filtered_data = null;
    this.old_current_page = 0;
    this.old_last_page = 0;
    this.max_fetch_date = formatDate(Date.now(), 'medium', 'en');
    this.max_date_paginated = '';
    this.isPaymentsLoaded = false;
    this.isSearching = false;
    this.isDateFilterApplied = false;
    this.colReorder = [];
    this.cachedColReorder = [];
    this.rows = [];
    this.ngOnInit();
  }

  async resetTable(value: string = '') {
    value = value.replace(/[^0-9a-zA-ZÑñ]/gi, '');
    if (value || (!this.old_table_data && !this.date_filtered_data)) return;

    this.search_phrase = '';
    const dt = <any>await this.datatableElement.dtInstance;

    if (this.isDateFilterApplied) {
      dt.search('').draw();
      return;
    }

    dt.rows().remove();

    dt.colReorder.order(this.cachedColReorder, true);

    dt.rows.add(this.old_table_data).draw();
    dt.colReorder.order(this.colReorder, true);

    this.cachedColReorder = null;
    this.current_page = this.old_current_page;
    this.last_page = this.old_last_page;
    this.old_table_data = null;
  }

  async resolvePaymentModalData(
    toCreate: boolean = false,
    toUpdate: boolean = false,
    searched_ticket = null,
    searched_payment = null
  ) {
    //
    let paymentFormGroup: FormGroup;

    if (toCreate && searched_ticket) {
      let violations_penalties = [];
      let total_amount = 0.0;
      searched_ticket.violations.forEach((violation) => {
        const type_length = violation.violation_types[0].penalties.length;
        const penalty = new FormControl(
          type_length > searched_ticket.offense_number
            ? violation.violation_types[0].penalties[
                searched_ticket.offense_number - 1
              ]
            : violation.violation_types[0].penalties[type_length - 1],
          [Validators.required, Validators.min(0.01), Validators.max(100000.0)]
        );
        total_amount += parseFloat(penalty.value);
        violations_penalties.push(penalty);
      });
      paymentFormGroup = this.formBuilder.group({
        ticket_number: [
          searched_ticket ? searched_ticket.number : '',
          [Validators.required],
        ],
        date_of_payment: [new Date().toISOString(), [Validators.required]],
        or_number: ['', [Validators.required]],
        penalties: this.formBuilder.array(violations_penalties),
        total_amount: [
          total_amount,
          [Validators.required, Validators.min(0), Validators.max(10000000)],
        ],
      });
    }

    if (toUpdate && searched_payment) {
      let violations_penalties = [];
      searched_payment.penalties.forEach((amount) => {
        if (amount !== '') {
          const penalty = new FormControl(amount, [
            Validators.required,
            Validators.min(0.0),
            Validators.max(100000.0),
          ]);
          violations_penalties.push(penalty);
        }
      });
      paymentFormGroup = this.formBuilder.group({
        ticket_number: [
          searched_payment ? searched_payment.ticket.number : '',
          [Validators.required],
        ],
        date_of_payment: [
          searched_payment ? searched_payment.date_of_payment : '',
          [Validators.required],
        ],
        or_number: [searched_payment.or_number, [Validators.required]],
        penalties: this.formBuilder.array(violations_penalties),
        total_amount: [
          searched_payment.total_amount,
          [
            Validators.required,
            Validators.min(0.0),
            Validators.max(10000000.0),
          ],
        ],
      });
    }

    return paymentFormGroup;
  }

  async searchPayment(payment_id) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    let err;
    let payment: any = await this.apiService
      .getPaymentDetails(payment_id)
      .catch(async (res) => {
        err = await this.utility.alertErrorStatus(res);
        return null;
      });
    if (!payment || !payment.data) {
      loading.dismiss();
      const alert = await this.utility.alertMessage('Payment Record Not Found');
      return await alert.present();
    }

    //filter violation types where vehicle type not equal to ticket's vehicle type
    payment.data.ticket.violations.forEach(
      (violation) =>
        (violation.violation_types = violation.violation_types.filter(
          (type) => type.vehicle_type === payment.data.ticket.vehicle_type
        ))
    );

    this.showPaymentFormModal(false, true, null, payment.data).finally(() => {
      loading.dismiss();
    }); //show modal component
    this.popoverController.dismiss();
  }

  async searchTable(value: string) {
    // value = value.replace(/[^0-9a-zA-ZÑñ]/gi, '');
    if (!value) return;
    const dt = await this.datatableElement.dtInstance;

    if (this.isDateFilterApplied) {
      if (!this.date_filtered_data) this.date_filtered_data = dt.rows().data();
      dt.search(value).draw();
      return;
    }

    if (this.isSearching) return;

    this.isSearching = true;

    if (!this.old_table_data) this.cacheTableData(dt);

    dt.rows().remove();
    this.search_phrase = value + '';

    const payments = await this.fetchPayments(
      1,
      10,
      'DESC',
      this.search_phrase
    );
    if (payments && payments.data) {
      this.current_page = payments.meta.current_page;
      this.last_page = payments.meta.last_page;
      let new_data = payments.data;
      let new_rows = this.formatTableData(new_data);
      this.addNewTableData(new_rows);
      await this.checkForScrollbar(true);
    }

    this.isSearching = false;
  }

  async searchTicket(scannedTicketNumber = null) {
    const loading = await this.utility.createIonLoading();
    this.allowScan = false; //don't listen for scanner
    await loading.present();
    const ticket_number =
      scannedTicketNumber ??
      this.ticketSearchFormGroup.get('ticket_number').value;
    let err = false;
    let ticket: any = await this.apiService
      .getTicketDetails(ticket_number)
      .catch(async (res) => {
        err = await this.utility.alertErrorStatus(res);
        return null;
      });

    if (!ticket || !ticket.data) {
      loading.dismiss();
      const alert = await this.utility.alertMessage(
        'Ticket Not Found',
        'No match found for ticket number ' + ticket_number
      );
      this.allowScan = true; // allow listening to scanner
      return await alert.present();
    }

    if (ticket && ticket.data.status_text === 'SETTLED') {
      loading.dismiss();
      const alert = await this.utility.alertMessage(
        'Payment Already Exist',
        'Ticket ' + ticket_number + ' is already SETTLED'
      );
      this.allowScan = true; // allow listening to scanner
      return await alert.present();
    }

    //filter violation types where vehicle type not equal to ticket's vehicle type
    ticket.data.violations.forEach(
      (violation) =>
        (violation.violation_types = violation.violation_types.filter(
          (type) => type.vehicle_type === ticket.data.vehicle_type
        ))
    );

    this.showPaymentFormModal(true, false, ticket.data).finally(() => {
      loading.dismiss();
    }); //show modal component
    this.popoverController.dismiss();
  }

  async showPaymentFormModal(
    toCreate: boolean = true,
    toUpdate: boolean = false,
    ticket = null,
    payment = null
  ) {
    const data = await this.resolvePaymentModalData(
      toCreate,
      toUpdate,
      ticket,
      payment
    ); //prepare form group for modal component
    if (!data) return;
    const modal = await this.modalController.create({
      component: PaymentFormModalComponent,
      backdropDismiss: false,
      componentProps: {
        title: toCreate
          ? 'New Payment for Ticket ' + ticket.number
          : 'Update Payment for Ticket ' + payment.ticket.number,
        new_payment: toCreate,
        update_payment: toUpdate,
        modalCtrl: this.modalController,
        searched_ticket: ticket,
        searched_payment: payment,
        paymentFormGroup: data,
      },
    });

    //listen to modal response
    modal.onDidDismiss().then(async (data: any) => {
      this.allowScan = true; //allow listening to scanner
      const status = data.data.status;
      if (status) {
        this.reloadPage();
      }
    });
    return await modal.present();
  }

  async showRowContextMenu(event) {
    event.preventDefault();
    const dtInstance = <any>await this.datatableElement.dtInstance;
    const row_index = event.srcElement._DT_CellIndex.row;
    const id = dtInstance.data()[row_index][0];
    const tn_index = dtInstance.colReorder.order().indexOf(1);
    const tn = dtInstance.data()[row_index][tn_index];
    const items = [
      {
        label: 'VIEW & EDIT',
        icon: 'open-outline',
        callback: async () => {
          await this.searchPayment(id);
        },
      },
      {
        label: 'DELETE',
        icon: 'trash-outline',
        callback: async () => {
          await this.confirmDeleteTicket(id);
        },
      },
    ];
    const componentProps = {
      title: 'Ticket ' + tn + ' Payment',
      subtitle: 'Select Action',
      isForm: false,
      items: items,
      isContextMenu: true,
    };
    const popover = await this.popoverController.create({
      component: PopoverComponent,
      componentProps: componentProps,
      event: event,
      id: 'rowContextMenu',
    });
    popover.onDidDismiss().then((data) => {
      const status = data.data ? data.data.status : false;
      if (status) this.reloadPage();
    });
    return await popover.present();
  }

  async showSideMenu() {
    await this.menuController.enable(true, this.export_menu_id);
    await this.menuController.toggle(this.export_menu_id);
  }

  async toggleColumnVisibility(index: number) {
    if (!this.datatableElement) return;
    const col = (await this.datatableElement.dtInstance).column(index);
    const v = col.visible();
    this.toggleModels[index] = !v;
    col.visible(!v);
  }

  async updateExportSetup(e: ExportPageSetup) {
    this.export_setup = e;
  }

  updatePDFHeaderTemplate(e) {
    this.pdfHeader = e;
  }
}

import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DataTableDirective } from 'angular-datatables';
import {
  IonContent,
  MenuController,
  ModalController,
  PopoverController,
  ViewWillLeave,
} from '@ionic/angular';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { UtilityService } from '../../services/utility.service';
import { PopoverComponent } from '../../modules/shared/popover/popover.component';
import { StorageService } from '../../services/storage.service';
import { take } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { TicketFormModalComponent } from '../../modules/shared/ticket-form-modal/ticket-form-modal.component';
import { ExportPageSetup } from '../../modules/shared/table-export-menu/table-export-menu.component';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.page.html',
  styleUrls: ['./tickets.page.scss'],
})
export class TicketsPage implements OnInit, ViewWillLeave {
  hasScrollbar = false;
  // checks if there's a scrollbar when the user resizes the window or zooms in/out
  @HostListener('window:resize', ['$event'])
  async onResize() {
    await this.checkForScrollbar();
  }

  async ionViewWillLeave(): Promise<void> {
    if (this.toggleModels && this.toggleModels.length > 0)
      await this.storage
        .set('settings_ticketTableColumns', JSON.stringify(this.toggleModels))
        .catch((res) => {});

    if (this.colReorder && this.colReorder.length > 0)
      await this.storage
        .set(
          'settings_ticketTableColumnsReorder',
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
  violatorSearchFormGroup: FormGroup;

  current_page: number = 1;
  last_page: number = 1;
  search_phrase = '';
  private old_table_data: any;
  private date_filtered_data: any;
  private old_current_page = 0;
  private old_last_page = 0;
  private max_fetch_date = formatDate(Date.now(), 'medium', 'en');
  private max_date_paginated = '';
  isTicketsLoaded = false;
  isSearching = false;
  isDateFilterApplied = false;
  toggleModels = [false, true, true, true, true, true, true, true, true, true];
  colReorder = [];
  cachedColReorder = [];
  pdfHeader: string;
  export_content_id: string = 'ticketTable';
  export_menu_id: string = 'ticketTableExportMenu';
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
      [5, 'desc'],
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
        download: 'download',
      },
    ],
    columnDefs: [
      {
        targets: [0],
        visible: false,
      },
      { targets: [1, 2, 3, 8], searchable: true },
      { targets: '_all', searchable: false, visible: true },
      { targets: [9], className: 'dynamic-text-alignment ion-padding-right' },
    ],
  };
  /*table structure END*/

  constructor(
    private apiService: ApiService,
    private menuController: MenuController,
    private utility: UtilityService,
    private popoverController: PopoverController,
    private storage: StorageService,
    private formBuilder: FormBuilder,
    private modalController: ModalController
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
    const tickets = await this.fetchTickets(1, 50, 'DESC', '', range);
    if (tickets && tickets.data) {
      this.current_page = tickets.meta.current_page;
      this.last_page = tickets.meta.last_page;
      let new_data = tickets.data;
      let new_rows = this.formatTableData(new_data);
      this.addNewTableData(new_rows);
    }

    //keep fetching all matched tickets
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

  async confirmDeleteTicket(ticket_id: number, ticket_number: string) {
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
            const operation = `Unable to delete ticket ${ticket_number}!`;
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //delete ticket
                    await this.deleteTicket(ticket_id);
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

  async deleteTicket(ticket_id) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const status = await this.apiService.deleteTicket(ticket_id).then(
      (res: any) => {
        return res.deleted;
      },
      async (res) => {
        return false;
      }
    );
    loading.dismiss();
    const feedback = status
      ? 'Ticket has been deleted.'
      : 'Ticket failed to delete.';
    const alert = await this.utility.alertMessage(feedback);
    this.popoverController.dismiss({
      dismissed: true,
      status: status,
    });
    return await alert.present();
  }

  async exportAs(index: number) {
    const dtInstance = <any>await this.datatableElement.dtInstance;
    dtInstance.table().button(index).trigger();
  }

  private async fetchTickets(
    page = 1,
    limit = 10,
    order = 'DESC',
    search = '',
    date_range = null
  ) {
    return this.apiService
      .getTickets(
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
    let n, x;
    let to_add = [];
    data.forEach((e) => {
      n = `${e.violator.last_name}, ${e.violator.first_name}, ${e.violator.middle_name}`;
      e.violator.name = n;
      x = e.violations.map(({ violation }) => violation);
      let violations = x.join(', ');
      e.violations = violations;
      let new_row = [
        (e.id + '').toUpperCase(),
        (e.number + '').toUpperCase(),
        e.violator.name.toUpperCase(),
        (e.violator.license_number + '').toUpperCase(),
        (e.violations + '').toUpperCase(),
        (e.apprehension_datetime + '').toUpperCase(),
        (e.issued_by + '').toUpperCase(),
        (e.status_text + '').toUpperCase(),
        e.payment.or_number + '',
        e.payment.total_amount + '',
      ];
      if (this.colReorder && this.colReorder.length > 0) {
        new_row = [
          new_row[this.colReorder[0]],
          new_row[this.colReorder[1]],
          new_row[this.colReorder[2]],
          new_row[this.colReorder[3]],
          new_row[this.colReorder[4]],
          new_row[this.colReorder[5]],
          new_row[this.colReorder[6]],
          new_row[this.colReorder[7]],
          new_row[this.colReorder[8]],
          new_row[this.colReorder[9]],
        ];
      }
      to_add.push(new_row);
    });
    return to_add;
  }

  private async initialLoadData() {
    this.isSearching = true;

    const tickets = await this.fetchTickets();
    if (tickets && tickets.data) {
      let new_data = tickets.data;
      this.current_page = tickets.meta.current_page;
      this.last_page = tickets.meta.last_page;
      this.rows = this.formatTableData(new_data);
    }

    this.isTicketsLoaded = true;

    const raw_data_colVis = await this.storage
      .get('settings_ticketTableColumns')
      .pipe(take(1))
      .toPromise()
      .catch((res) => {
        return null;
      });
    this.toggleModels = JSON.parse(raw_data_colVis) ?? this.toggleModels;

    const raw_data_colReorder = await this.storage
      .get('settings_ticketTableColumnsReorder')
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
    const tickets = await this.fetchTickets(
      this.current_page + 1,
      limit,
      order,
      this.search_phrase,
      date_range
    );
    if (tickets && (tickets.data || tickets.meta.new_records)) {
      let new_data = tickets.data;
      if (tickets.meta.new_records && tickets.meta.new_records.length > 0) {
        const untracked_records = tickets.meta.new_records;
        this.max_fetch_date = untracked_records[0].apprehension_datetime;
        new_data = new_data.concat(untracked_records);
      }
      if (new_data.length > 0) {
        this.current_page = tickets.meta.current_page;
        this.last_page = tickets.meta.last_page;
        this.max_date_paginated = tickets.meta.max_date_paginated;
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

  async promptViolatorSearch(searchByName = false) {
    if (!searchByName) {
      this.violatorSearchFormGroup = this.formBuilder.group({
        license_number: ['', [Validators.required]],
      });
    } else {
      this.violatorSearchFormGroup = this.formBuilder.group({
        first_name: [
          '',
          [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
        ],
        middle_name: [
          '',
          [Validators.required, Validators.pattern('[a-zA-ZÑñ ]*')],
        ],
        last_name: [
          '',
          [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
        ],
        birth_date: ['', [Validators.required]],
      });
    }

    const componentProps = {
      title: searchByName
        ? 'Enter Violator Details'
        : "Enter Driver's License Number",
      subtitle: '',
      isForm: true,
      parentFormGroup: this.violatorSearchFormGroup,
      items: searchByName
        ? [
            {
              label: 'Last Name',
              label_position: 'floating',
              input_type: 'text',
              controller: 'last_name',
              placeholder: 'Enter last name',
            },
            {
              label: 'First Name',
              label_position: 'floating',
              input_type: 'text',
              controller: 'first_name',
              placeholder: 'Enter first name',
            },
            {
              label: 'Middle Name',
              label_position: 'floating',
              input_type: 'text',
              controller: 'middle_name',
              placeholder: 'Enter middle name',
            },
            {
              label: 'Birth Date',
              label_position: 'floating',
              input_type: 'date',
              controller: 'birth_date',
              placeholder: 'Enter birth date',
            },
          ]
        : [
            {
              label: 'License Number',
              label_position: 'floating',
              input_type: 'text',
              controller: 'license_number',
              placeholder: 'Enter license number',
            },
          ],
      buttons: searchByName
        ? [
            {
              label: 'Enter License Number',
              color: 'primary',
              class: 'ion-margin-vertical',
              size: 'small',
              callback: async () => {
                await this.popoverController.dismiss();
                this.promptViolatorSearch(false);
              },
            },
          ]
        : [
            {
              label: "Enter Violator's Name",
              color: 'primary',
              class: 'ion-margin-vertical',
              size: 'small',
              callback: async () => {
                await this.popoverController.dismiss();
                this.promptViolatorSearch(true);
              },
            },
          ],
      submit_label: 'Create New Ticket',
      formSubmitCallback: () => this.startCreateTicket(searchByName),
    };
    const popover = await this.popoverController.create({
      component: PopoverComponent,
      componentProps: componentProps,
      id: 'violatorSearch',
    });
    return await popover.present();
  }

  reloadPage() {
    this.current_page = 1;
    this.last_page = 1;
    this.search_phrase = '';
    this.old_table_data = null;
    this.date_filtered_data = null;
    this.old_current_page = 0;
    this.old_last_page = 0;
    this.max_fetch_date = formatDate(Date.now(), 'medium', 'en');
    this.max_date_paginated = '';
    this.isTicketsLoaded = false;
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

  async resolveTicketModalData(
    new_ticket: boolean = false,
    update_ticket: boolean = false,
    searched_violator = null,
    searched_ticket = null
  ) {
    const violations = await this.apiService
      .getViolationsByVehicleType()
      .catch((res) => {
        return null;
      });
    if (!violations) return null;
    let users = await this.apiService
      .getUserAccounts(1, 10, 'ASC', '', true)
      .catch(async (res) => {
        return null;
      });

    let ticketFormGroup: FormGroup;
    if (new_ticket && searched_violator) {
      ticketFormGroup = this.formBuilder.group({
        ticket_number: ['', [Validators.required]],
        last_name: [
          searched_violator.last_name,
          [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
        ],
        first_name: [
          searched_violator.first_name,
          [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
        ],
        middle_name: [
          searched_violator.middle_name != 'null'
            ? searched_violator.middle_name
            : '',
          [Validators.required, Validators.pattern('[a-zA-ZÑñ ]*')],
        ],
        birth_date: [searched_violator.birth_date, [Validators.required]],
        license_number: [
          searched_violator.license_number != 'null'
            ? searched_violator.license_number
            : '',
          [Validators.pattern('[a-zA-Z0-9]*')],
        ],
        apprehension_datetime: ['', [Validators.required]],
        officer_user_id: ['', [Validators.required]],
        vehicle_type: ['', [Validators.required]],
        committed_violations: [null, [Validators.required]],
      });
    }

    if (update_ticket && searched_ticket) {
      let comm_violations = [];
      searched_ticket.violations.forEach((element) => {
        comm_violations.push(element.id + '');
      });

      ticketFormGroup = this.formBuilder.group({
        ticket_number: [searched_ticket.number, [Validators.required]],
        last_name: [
          searched_ticket.violator.last_name,
          [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
        ],
        first_name: [
          searched_ticket.violator.first_name,
          [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
        ],
        middle_name: [
          searched_ticket.violator.middle_name != 'null'
            ? searched_ticket.violator.middle_name
            : '',
          [Validators.required, Validators.pattern('[a-zA-ZÑñ ]*')],
        ],
        birth_date: [
          searched_ticket.violator.birth_date,
          [Validators.required],
        ],
        license_number: [
          searched_ticket.violator.license_number != 'null'
            ? searched_ticket.violator.license_number
            : '',
          [Validators.pattern('[a-zA-Z0-9]*')],
        ],
        vehicle_type: [searched_ticket.vehicle_type, [Validators.required]],
        apprehension_datetime: [
          searched_ticket.apprehension_datetime,
          [Validators.required],
        ],
        officer_user_id: [
          searched_ticket.officer_user_id + '',
          [Validators.required],
        ],
        committed_violations: [comm_violations, [Validators.required]],
      });
    }

    return {
      ticketFormGroup: ticketFormGroup,
      violations: violations,
      users: users.data,
    };
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

    const tickets = await this.fetchTickets(1, 10, 'DESC', this.search_phrase);
    if (tickets && tickets.data) {
      this.current_page = tickets.meta.current_page;
      this.last_page = tickets.meta.last_page;
      let new_data = tickets.data;
      let new_rows = this.formatTableData(new_data);
      this.addNewTableData(new_rows);
      await this.checkForScrollbar(true);
    }

    this.isSearching = false;
  }

  async searchTicket(ticket_id, ticket_number) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    let err = false;
    let ticket: any = await this.apiService
      .getTicketDetails(ticket_number)
      .catch(async (res) => {
        err = await this.utility.alertErrorStatus(res);
        return null;
      });
    if (!ticket) {
      loading.dismiss();
      return;
    }

    this.showTicketFormModal(
      false,
      true,
      null,
      ticket.data,
      ticket_number
    ).finally(() => {
      loading.dismiss();
    });
    this.popoverController.dismiss();
  }

  async searchViolator(formData: FormData, fallbackData: {}) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    let err = false;
    let violator: any = await this.apiService
      .getViolatorDetails(formData)
      .catch(async (res) => {
        loading.dismiss();
        err = await this.utility.alertErrorStatus(res);
      });
    if (!violator || !violator.data) {
      violator = {
        data: fallbackData,
      };
    }

    this.showTicketFormModal(true, false, violator.data).finally(() => {
      loading.dismiss();
    });
    this.popoverController.dismiss();
  }

  async showTicketFormModal(
    toCreate: boolean = true,
    toUpdate: boolean = false,
    violator = null,
    ticket = null,
    ticket_id = 0
  ) {
    const data = await this.resolveTicketModalData(
      toCreate,
      toUpdate,
      violator,
      ticket
    );
    if (!data) return;
    const modal = await this.modalController.create({
      component: TicketFormModalComponent,
      backdropDismiss: false,
      componentProps: {
        title: toCreate ? 'New Ticket' : 'Ticket ' + ticket_id,
        new_ticket: toCreate,
        update_ticket: toUpdate,
        modalCtrl: this.modalController,
        searched_violator: violator,
        searched_ticket: ticket,
        ticket_id: ticket_id,
        violations: data.violations,
        ticketFormGroup: data.ticketFormGroup,
        users: data.users,
      },
    });

    modal.onDidDismiss().then(async (data: any) => {
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
    const status_index = dtInstance.colReorder.order().indexOf(7);
    const status = dtInstance.data()[row_index][status_index];

    const items = [
      {
        label: 'VIEW & EDIT',
        icon: 'open-outline',
        callback: async () => {
          await this.searchTicket(id, tn);
        },
      },
    ];

    const deleteOption =
      status === 'SETTLED'
        ? null
        : {
            label: 'DELETE',
            icon: 'trash-outline',
            callback: async () => {
              await this.confirmDeleteTicket(id, tn);
            },
          };
    if (deleteOption !== null) items.push(deleteOption);

    const componentProps = {
      title: 'Ticket ' + tn,
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

  async startCreateTicket(searchByName: boolean) {
    let formData = new FormData();
    let fallbackData: any = null;
    if (!searchByName) {
      fallbackData = {
        license_number:
          this.violatorSearchFormGroup.get('license_number').value,
        tickets_count: 0,
      };
    }
    if (searchByName) {
      const f = this.violatorSearchFormGroup.get('first_name').value + '';
      const m = this.violatorSearchFormGroup.get('middle_name').value + '';
      const l = this.violatorSearchFormGroup.get('last_name').value + '';
      fallbackData = {
        first_name: f.trim(),
        middle_name: m.trim(),
        last_name: l.trim(),
        birth_date: this.violatorSearchFormGroup.get('birth_date').value,
        tickets_count: 0,
      };
    }

    for (const key in this.violatorSearchFormGroup.value) {
      formData.append(key, this.violatorSearchFormGroup.get(key).value);
    }
    await this.searchViolator(formData, fallbackData);
  }

  async toggleColumnVisibility(index: number) {
    if (!this.datatableElement) return;
    const col = (await this.datatableElement.dtInstance).column(index);
    const v = col.visible();
    this.toggleModels[index] = !v;
    col.visible(!v);
  }

  updateExportSetup(e: ExportPageSetup) {
    this.export_setup = e;
  }

  updatePDFHeaderTemplate(e: string) {
    this.pdfHeader = e;
  }
}

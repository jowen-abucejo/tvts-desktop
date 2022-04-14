import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { ViolationFormModalComponent } from '../../modules/shared/violation-form-modal/violation-form-modal.component';
import { PopoverComponent } from '../../modules/shared/popover/popover.component';
import { ApiService } from '../../services/api.service';
import { StorageService } from '../../services/storage.service';
import { UtilityService } from '../../services/utility.service';

@Component({
  selector: 'app-violations',
  templateUrl: './violations.page.html',
  styleUrls: ['./violations.page.scss'],
})
export class ViolationsPage implements OnInit, ViewWillLeave {
  hasScrollbar = false;

  // checks if there's a scrollbar when the user resizes the window or zooms in/out
  @HostListener('window:resize', ['$event'])
  async onResize() {
    await this.checkForScrollbar();
  }

  async ionViewWillLeave(): Promise<void> {
    if (this.toggleModels && this.toggleModels.length > 0)
      await this.storage
        .set(
          'settings_violationTableColumns',
          JSON.stringify(this.toggleModels)
        )
        .catch((res) => {});

    if (this.colReorder && this.colReorder.length > 0)
      await this.storage
        .set(
          'settings_violationTableColumnsReorder',
          JSON.stringify(this.colReorder)
        )
        .catch((res) => {});
  }

  @ViewChild(DataTableDirective, { static: false })
  datatableElement: DataTableDirective;
  @ViewChild('tableContent', { static: false }) private content: IonContent;

  current_page: number = 1;
  last_page: number = 1;
  search_phrase = '';
  private old_table_data: any;
  private old_current_page = 0;
  private old_last_page = 0;
  isViolationsLoaded = false;
  isSearching = false;
  toggleModels = [false, true, true, true, true, true, true];
  colReorder = [];
  cachedColReorder = [];
  pdfHeader: string;
  export_content_id: string = 'violationTable';
  export_menu_id: string = 'violationTableExportMenu';
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
      [2, 'asc'],
      [1, 'asc'],
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
      { targets: [1, 2, 3], searchable: true },
      { targets: '_all', searchable: false, visible: true },
    ],
  };
  /*table structure END*/

  constructor(
    private apiService: ApiService,
    private popoverController: PopoverController,
    private utility: UtilityService,
    private storage: StorageService,
    private modalController: ModalController,
    private menuController: MenuController,
    private formBuilder: FormBuilder
  ) {}

  async ngOnInit() {
    await this.initialLoadData();
  }

  private addNewTableData(data: any[]) {
    if (!this.datatableElement) return;
    this.datatableElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.rows.add(data);
      dtInstance.rows().draw();
    });
  }

  private cacheTableData(dt: DataTables.Api) {
    this.old_current_page = this.current_page;
    this.old_last_page = this.last_page;
    this.old_table_data = dt.rows().data();
    this.cachedColReorder = this.colReorder;
  }

  async checkForScrollbar(ignoreSearchingStatus = false) {
    const scrollElement = await this.content.getScrollElement();
    this.hasScrollbar = scrollElement.scrollHeight > scrollElement.clientHeight;
    while (!this.hasScrollbar && this.current_page < this.last_page) {
      if (!this.isSearching || ignoreSearchingStatus) {
        await this.loadData().then(() => {
          this.hasScrollbar =
            scrollElement.scrollHeight > scrollElement.clientHeight;
        });
      }
    }
    return;
  }

  async confirmDeleteViolation(
    violation_id: number,
    violation_type_id: number
  ) {
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
            const operation = 'Unable to delete violation';
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //delete violation
                    await this.deleteViolation(violation_id, violation_type_id);
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

  async deleteViolation(violation_id: number, violation_type_id: number) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const status = await this.apiService
      .deleteViolation(violation_id, violation_type_id)
      .then(
        (res: any) => {
          return res.deleted;
        },
        async (res) => {
          return false;
        }
      );
    loading.dismiss();
    const feedback = status
      ? 'Violation has been deleted.'
      : 'Violation failed to delete.';
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

  private async fetchViolations(
    page = 1,
    limit = 10,
    order = 'ASC',
    search = ''
  ) {
    return this.apiService
      .getViolations(page, limit, order, search)
      .catch((res) => {
        this.utility.alertErrorStatus(res);
        return null;
      });
  }

  private formatTableData(data: any[]) {
    let to_add = [];
    data.forEach((e) => {
      e.id = e.id + '';
      e.violation_code = e.violation_code + ''.toUpperCase();
      e.violation = e.violation + ''.toUpperCase();
      e.violation_types.forEach((type) => {
        const status = type.active ? 'ACTIVE' : 'NOT ACTIVE';
        let new_row = [
          `${e.id}:${type.id}:${status}:${e.tickets_count}:${e.violation_types_count}:${type.violations_count}`,
          ('' + e.violation_code).toUpperCase(),
          ('' + e.violation).toUpperCase(),
          ('' + type.type).toUpperCase(),
          ('' + type.vehicle_type).toUpperCase(),
          type.penalties.join(', ').toUpperCase(),
          status,
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
          ];
        }
        to_add.push(new_row);
      });
    });
    return to_add;
  }

  private async initialLoadData() {
    this.isSearching = true;
    const violations = await this.fetchViolations();

    if (violations && violations.data) {
      let new_data = violations.data;
      this.current_page = violations.meta.current_page;
      this.last_page = violations.meta.last_page;
      this.rows = this.formatTableData(new_data);
    }

    this.isViolationsLoaded = true;

    const raw_data_colVis = await this.storage
      .get('settings_violationTableColumns')
      .pipe(take(1))
      .toPromise()
      .catch((res) => {
        return null;
      });
    this.toggleModels = JSON.parse(raw_data_colVis) ?? this.toggleModels;

    const raw_data_colReorder = await this.storage
      .get('settings_violationTableColumnsReorder')
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

  async loadData(event = null, limit = 10, order = 'ASC') {
    this.isSearching = true;
    const violations = await this.fetchViolations(
      this.current_page + 1,
      limit,
      order,
      this.search_phrase
    );
    if (violations && violations.data) {
      let new_data = violations.data;
      if (new_data.length > 0) {
        this.current_page = violations.meta.current_page;
        this.last_page = violations.meta.last_page;
        let new_rows = this.formatTableData(new_data);
        this.addNewTableData(new_rows);
      }
    }
    if (event) event?.target.complete();
    this.isSearching = false;
  }

  async promptColVisMenu(ev) {
    const dtInstance = await this.datatableElement.dtInstance;
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

  reloadPage() {
    this.current_page = 1;
    this.last_page = 1;
    this.search_phrase = '';
    this.old_table_data = null;
    this.old_current_page = 0;
    this.old_last_page = 0;
    this.isViolationsLoaded = false;
    this.isSearching = false;
    this.colReorder = [];
    this.cachedColReorder = [];
    this.rows = [];
    this.ngOnInit();
  }

  async resetTable(value: string = '') {
    value = value.replace(/[^0-9a-zA-ZÑñ ]/gi, '');
    if (value || !this.old_table_data) return;

    this.search_phrase = '';
    const dt = <any>await this.datatableElement.dtInstance;

    dt.rows().remove();

    dt.colReorder.order(this.cachedColReorder, true);

    dt.rows.add(this.old_table_data).draw();
    dt.colReorder.order(this.colReorder, true);

    this.cachedColReorder = null;
    this.current_page = this.old_current_page;
    this.last_page = this.old_last_page;
    this.old_table_data = null;
  }

  async resolveViolationModalData(
    searched_violation = null,
    toCreate: boolean = true
  ) {
    let violationFormGroup: FormGroup;
    violationFormGroup = this.formBuilder.group({
      violation_code: [
        searched_violation ? searched_violation.violation_code : '',
        toCreate ? null : [Validators.required],
      ],
      violation: [
        searched_violation ? searched_violation.violation : '',
        [Validators.required],
      ],
      type: [
        searched_violation ? searched_violation.violation_types[0].type : '',
        [Validators.required],
      ],
      vehicle_type: [
        searched_violation
          ? searched_violation.violation_types[0].vehicle_type
          : '',
        [Validators.required],
      ],
      penalties: [
        searched_violation
          ? searched_violation.violation_types[0].penalties.join()
          : '',
        [
          Validators.required,
          Validators.pattern(
            /^[1-9][0-9]*(.[0-9]{2})?(,[1-9][0-9]*(.[0-9]{2})?)*$/
          ),
        ],
      ],
    });

    return violationFormGroup;
  }

  async searchViolation(violation_id: number, violation_type_id: number) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    let err = false;
    let violation: any = await this.apiService
      .getViolationDetails(violation_id, violation_type_id)
      .catch(async (res) => {
        err = await this.utility.alertErrorStatus(res);
        return null;
      });
    if (!violation || !violation.data) {
      loading.dismiss();
      return;
    }
    this.showViolationFormModal(
      false,
      true,
      violation_id,
      violation_type_id,
      violation.data
    ).finally(() => {
      loading.dismiss();
    });
    this.popoverController.dismiss();
  }

  async searchTable(value: string) {
    // value = value.replace(/[^0-9a-zA-ZÑñ]/gi, '');
    if (!value) return;
    const dt = await this.datatableElement.dtInstance;

    if (this.isSearching) return;

    this.isSearching = true;

    if (!this.old_table_data) this.cacheTableData(dt);

    dt.rows().remove();
    this.search_phrase = value + '';

    const violations = await this.fetchViolations(
      1,
      10,
      'DESC',
      this.search_phrase
    );
    if (violations && violations.data) {
      this.current_page = violations.meta.current_page;
      this.last_page = violations.meta.last_page;
      let new_data = violations.data;
      let new_rows = this.formatTableData(new_data);
      this.addNewTableData(new_rows);
      await this.checkForScrollbar(true);
    }

    this.isSearching = false;
  }

  async showRowContextMenu(event) {
    event.preventDefault();
    const dtInstance = <any>await this.datatableElement.dtInstance;
    const row_index = event.srcElement._DT_CellIndex.row;
    let old_row_id: string = dtInstance
      .cell({ row: row_index, column: 0 })
      .data();
    let ids_array = old_row_id.split(':');

    const violation_id: number = +ids_array[0];
    const violation_type_id: number = +ids_array[1];
    const code_index =
      this.colReorder && this.colReorder.length > 0
        ? this.colReorder.indexOf(1)
        : 1;
    const code = dtInstance.cell({ row: row_index, column: code_index }).data();
    let items = [];

    const viewEditOption = {
      label: 'VIEW & EDIT',
      icon: 'open-outline',
      callback: async () => {
        await this.searchViolation(violation_id, violation_type_id);
      },
    };

    const toggleActiveOption = {
      label: ids_array[2] == 'ACTIVE' ? 'SET TO NOT ACTIVE' : 'SET TO ACTIVE',
      icon: 'toggle-outline',
      callback: async () => {
        await this.toggleStatus(violation_id, violation_type_id, row_index);
      },
    };

    const deleteOption =
      +ids_array[3] === 0
        ? {
            label: 'DELETE',
            icon: 'trash-outline',
            callback: async () => {
              await this.confirmDeleteViolation(
                violation_id,
                violation_type_id
              );
            },
          }
        : null;

    if (viewEditOption) items.push(viewEditOption);
    items.push(toggleActiveOption);
    if (deleteOption) items.push(deleteOption);

    const componentProps = {
      title: 'Violation ' + code,
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

  async showViolationFormModal(
    toCreate: boolean = true,
    toUpdate: boolean = false,
    violation_id: number = null,
    violation_type_id: number = null,
    violation = null
  ) {
    const data = await this.resolveViolationModalData(violation, toCreate);
    if (!data) return;
    const modal = await this.modalController.create({
      component: ViolationFormModalComponent,
      backdropDismiss: false,
      componentProps: {
        title: toCreate ? 'New Violation' : 'Update Violation',
        new_violation: toCreate,
        update_violation: toUpdate,
        modalCtrl: this.modalController,
        searched_violation: violation,
        violationFormGroup: data,
        violation_id: violation_id,
        violation_type_id: violation_type_id,
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

  async toggleStatus(
    violation_id: number,
    violation_type_id: number,
    row_index: number
  ) {
    this.popoverController.dismiss();
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const status = await this.apiService
      .toggleViolationStatus(violation_id, violation_type_id)
      .then(
        (res: any) => {
          return res.update_status;
        },
        async (res) => {
          return false;
        }
      );
    loading.dismiss();
    if (status) {
      const dtInstance = await this.datatableElement.dtInstance.catch((res) => {
        return null;
      });
      if (!dtInstance) return;
      let status_index =
        this.colReorder && this.colReorder.length > 0
          ? this.colReorder.indexOf(6)
          : 6;

      let old_status = dtInstance
        .cell({ row: row_index, column: status_index })
        .data();

      const new_status = old_status === 'ACTIVE' ? 'NOT ACTIVE' : 'ACTIVE';

      dtInstance
        .cell({ row: row_index, column: status_index })
        .data(new_status);
      let old_row_id: string = dtInstance
        .cell({ row: row_index, column: 0 })
        .data();

      let new_row_id: string = old_row_id.replace(old_status, new_status);

      dtInstance.cell({ row: row_index, column: 0 }).data(new_row_id);
      return;
    }
    const alert = await this.utility.alertMessage(
      'Violation failed to change active status.'
    );
    return await alert.present();
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

  updatePDFHeaderTemplate(e) {
    this.pdfHeader = e;
  }
}

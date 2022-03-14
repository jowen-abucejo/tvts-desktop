import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonContent,
  ModalController,
  PopoverController,
  ViewWillLeave,
} from '@ionic/angular';
import { DataTableDirective } from 'angular-datatables';
import { take } from 'rxjs/operators';
import { UserFormModalComponent } from 'src/app/modules/shared/user-form-modal/user-form-modal.component';
import { PopoverComponent } from '../../modules/shared/popover/popover.component';
import { ApiService } from '../../services/api.service';
import { StorageService } from '../../services/storage.service';
import { UtilityService } from '../../services/utility.service';
@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit, ViewWillLeave {
  hasScrollbar = false;

  // checks if there's a scrollbar when the user resizes the window or zooms in/out
  @HostListener('window:resize', ['$event'])
  async onResize() {
    await this.checkForScrollbar();
  }

  async ionViewWillLeave(): Promise<void> {
    if (this.toggleModels && this.toggleModels.length > 0)
      await this.storage
        .set('settings_userTableColumns', JSON.stringify(this.toggleModels))
        .catch((res) => {});

    if (this.colReorder && this.colReorder.length > 0)
      await this.storage
        .set(
          'settings_userTableColumnsReorder',
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
  isUsersLoaded = false;
  isSearching = false;
  toggleModels = [false, true, true, true, true];
  colReorder = [];
  cachedColReorder = [];
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
      },
      {
        extend: 'pdf',
        text: 'PDF',
        exportOptions: {
          columns: ':visible',
        },
        orientation: 'portrait',
        customize: function (doc) {
          doc.content[1].table.widths = Array(
            doc.content[1].table.body[0].length + 1
          )
            .join('*')
            .split('');
          doc.defaultStyle.alignment = 'center';
        },
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

  async confirmDeleteUserAccount(user_id: number) {
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
            const operation = 'Unable to delete account';
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //delete user
                    await this.deleteUserAccount(user_id);
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

  async deleteUserAccount(user_id: number) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const status = await this.apiService.deleteUserAccount(user_id, true).then(
      (res: any) => {
        return res.deleted;
      },
      async (res) => {
        return false;
      }
    );
    loading.dismiss();
    const feedback = status
      ? 'User Account has been deleted.'
      : 'User Account failed to delete.';
    const alert = await this.utility.alertMessage(feedback);
    this.popoverController.dismiss({
      dismissed: true,
      status: status,
    });
    return await alert.present();
  }

  async exportAs(index: number) {
    const printable_columns = this.toggleModels
      .map((v, i) => (v ? i : -1))
      .filter((v) => v > -1);
    (<any>this.datatableElement.dtOptions).buttons[
      index
    ].exportOptions.columns = printable_columns;
    this.datatableElement.dtInstance.then((dtInstance: any) => {
      dtInstance.table().button(index).trigger();
    });
  }

  private async fetchUserAccounts(
    page = 1,
    limit = 10,
    order = 'ASC',
    search = ''
  ) {
    return this.apiService
      .getUserAccounts(page, limit, order, search)
      .catch((res) => {
        this.utility.alertErrorStatus(res);
        return null;
      });
  }

  private formatTableData(data: any[]) {
    let to_add = [];
    data.forEach((e) => {
      const status = !e.deleted_at ? 'ACTIVE' : 'NOT ACTIVE';
      let new_row = [
        `${e.id}:${e.tickets_count}`,
        ('' + e.name).toUpperCase(),
        '' + e.username,
        ('' + e.type).toUpperCase(),
        status,
      ];
      if (this.colReorder && this.colReorder.length > 0) {
        new_row = [
          new_row[this.colReorder[0]],
          new_row[this.colReorder[1]],
          new_row[this.colReorder[2]],
          new_row[this.colReorder[3]],
          new_row[this.colReorder[4]],
        ];
      }
      to_add.push(new_row);
    });
    return to_add;
  }

  private async initialLoadData() {
    this.isSearching = true;
    const users = await this.fetchUserAccounts();

    if (users && users.data) {
      let new_data = users.data;
      this.current_page = users.meta.current_page;
      this.last_page = users.meta.last_page;
      this.rows = this.formatTableData(new_data);
    }

    this.isUsersLoaded = true;

    const raw_data_colVis = await this.storage
      .get('settings_userTableColumns')
      .pipe(take(1))
      .toPromise()
      .catch((res) => {
        return null;
      });
    this.toggleModels = JSON.parse(raw_data_colVis) ?? this.toggleModels;

    const raw_data_colReorder = await this.storage
      .get('settings_userTableColumnsReorder')
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
    const users = await this.fetchUserAccounts(
      this.current_page + 1,
      limit,
      order,
      this.search_phrase
    );
    if (users && users.data) {
      let new_data = users.data;
      if (new_data.length > 0) {
        this.current_page = users.meta.current_page;
        this.last_page = users.meta.last_page;
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
    this.isUsersLoaded = false;
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

  async resolveUserModalData(searched_user = null, toCreate: boolean = true) {
    let userFormGroup: FormGroup;
    userFormGroup = this.formBuilder.group({
      name: [
        searched_user && !toCreate ? searched_user.name : '',
        [Validators.required, Validators.pattern('[a-zA-ZÑñ][a-zA-ZÑñ ]*')],
      ],
      username: [
        searched_user && !toCreate ? searched_user.username : '',
        [Validators.required, Validators.pattern(/^[a-zA-ZÑñ0-9@$_.]+$/)],
      ],
      user_type: [
        searched_user && !toCreate ? searched_user.type : '',
        [Validators.required],
      ],
    });

    return userFormGroup;
  }

  async searchUserAccount(user_id: number) {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    let err = false;
    let user: any = await this.apiService
      .getUserAccountDetails(user_id)
      .catch(async (res) => {
        err = await this.utility.alertErrorStatus(res);
        return null;
      });
    if (!user || !user.data) {
      loading.dismiss();
      return;
    }
    this.showUserFormModal(false, true, user_id, user.data).finally(() => {
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

    const users = await this.fetchUserAccounts(
      1,
      10,
      'DESC',
      this.search_phrase
    );
    if (users && users.data) {
      this.current_page = users.meta.current_page;
      this.last_page = users.meta.last_page;
      let new_data = users.data;
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

    const user_id: number = +ids_array[0];
    const tickets_count: number = +ids_array[1];

    const status_index =
      this.colReorder && this.colReorder.length > 0
        ? this.colReorder.indexOf(4)
        : 4;
    const status = dtInstance
      .cell({ row: row_index, column: status_index })
      .data();

    const username_index =
      this.colReorder && this.colReorder.length > 0
        ? this.colReorder.indexOf(2)
        : 2;
    const username = dtInstance
      .cell({ row: row_index, column: username_index })
      .data();
    let items = [];

    const viewEditOption = {
      label: 'VIEW & EDIT',
      icon: 'open-outline',
      callback: async () => {
        await this.searchUserAccount(user_id);
      },
    };

    const toggleActiveOption = {
      label: status == 'ACTIVE' ? 'SET TO NOT ACTIVE' : 'SET TO ACTIVE',
      icon: 'toggle-outline',
      callback: async () => {
        await this.toggleStatus(user_id, row_index);
      },
    };

    const deleteOption =
      tickets_count === 0
        ? {
            label: 'DELETE',
            icon: 'trash-outline',
            callback: async () => {
              await this.confirmDeleteUserAccount(user_id);
            },
          }
        : null;

    if (viewEditOption) items.push(viewEditOption);
    items.push(toggleActiveOption);
    if (deleteOption) items.push(deleteOption);

    const componentProps = {
      title: "User Account of '" + username + "'",
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

  async showUserFormModal(
    toCreate: boolean = true,
    toUpdate: boolean = false,
    user_id: number = null,
    user = null
  ) {
    const data = await this.resolveUserModalData(user, toCreate);
    if (!data) return;
    const modal = await this.modalController.create({
      component: UserFormModalComponent,
      backdropDismiss: false,
      componentProps: {
        title: toCreate ? 'New User Account' : 'Update User Account',
        new_user: toCreate,
        update_user: toUpdate,
        modalCtrl: this.modalController,
        searched_user: user,
        userFormGroup: data,
        user_id: user_id,
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

  async toggleStatus(user_id: number, row_index: number) {
    this.popoverController.dismiss();
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const status = await this.apiService.deleteUserAccount(user_id, false).then(
      (res: any) => {
        return res.update_status;
      },
      async (res) => {
        return await this.utility.alertErrorStatus(res);
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
          ? this.colReorder.indexOf(4)
          : 4;

      let old_status = dtInstance
        .cell({ row: row_index, column: status_index })
        .data();

      const new_status = old_status === 'ACTIVE' ? 'NOT ACTIVE' : 'ACTIVE';

      dtInstance
        .cell({ row: row_index, column: status_index })
        .data(new_status);
    }
    return;
  }

  async toggleColumnVisibility(index: number) {
    if (!this.datatableElement) return;
    const col = (await this.datatableElement.dtInstance).column(index);
    const v = col.visible();
    this.toggleModels[index] = !v;
    col.visible(!v);
  }
}

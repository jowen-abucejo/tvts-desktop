import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  IonContent,
  MenuController,
  PopoverController,
  ViewWillLeave,
} from '@ionic/angular';
import { DataTableDirective } from 'angular-datatables';
import { take } from 'rxjs/operators';
import { PopoverComponent } from 'src/app/modules/shared/popover/popover.component';
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
    await this.storage
      .set('settings_violationTableColumns', JSON.stringify(this.toggleModels))
      .catch((res) => {});

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
  /*table structure START HERE*/
  rows = [];
  dtOptions = {
    paging: false,
    responsive: true,
    searching: true,
    ordering: true,
    colReorder: true,
    order: [
      [2, 'ASC'],
      [1, 'ASC'],
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
    private menuController: MenuController,
    private popoverController: PopoverController,
    private utility: UtilityService,
    private storage: StorageService
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
      e.deleted_at = !e.deleted_at ? 'ACTIVE' : 'NOT ACTIVE';
      e.violation_types.forEach((type) => {
        let new_row = [
          e.id + ':' + type.id,
          ('' + e.violation_code).toUpperCase(),
          ('' + e.violation).toUpperCase(),
          ('' + type.type).toUpperCase(),
          ('' + type.vehicle_type).toUpperCase(),
          type.penalties.join(', ').toUpperCase(),
          e.deleted_at,
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

    (await this.datatableElement.dtInstance).on('column-reorder', async () => {
      this.colReorder = (<any>(
        await this.datatableElement.dtInstance
      )).colReorder.order();
    });

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

  async resetTable(value: string = '') {
    value = value.replace(/[^0-9a-zA-ZÑñ]/gi, '');
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

  async searchTable(value: string) {
    value = value.replace(/[^0-9a-zA-ZÑñ]/gi, '');
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
    const dtInstance = await this.datatableElement.dtInstance;
    const row_index = event.srcElement._DT_CellIndex.row;
    const id = dtInstance.data()[row_index][0];
    const tn = dtInstance.data()[row_index][1];
    alert(id + ' ' + tn);
  }

  async showSideMenu(menuId: string) {
    this.menuController.toggle(menuId);
  }

  async toggleColumnVisibility(index: number) {
    if (!this.datatableElement) return;
    const col = (await this.datatableElement.dtInstance).column(index);
    const v = col.visible();
    this.toggleModels[index] = !v;
    col.visible(!v);
  }
}

import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DataTableDirective } from 'angular-datatables';
import { AlertController, AlertOptions, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.page.html',
  styleUrls: ['./tickets.page.scss'],
})
export class TicketsPage implements OnInit {
  tickets;
  isTicketsLoaded = false;
  current_page: number = 1;
  last_page: number = 1;
  search_phrase = '';
  private old_table_data: any;
  private old_current_page = 0;
  private old_last_page = 0;
  private isSearching = false;
  toggleModels = [false, true, true, false, true, true, true];

  /*table structure START HERE*/
  rows = [];
  dtOptions = {
    paging: false,
    responsive: true,
    searching: true,
    ordering: true,
    order: [
      [5, 'DESC'],
      [0, 'DESC'],
    ],
    autoWidth: true,
    info: false,
    dom: 'rtip',
    processing: true,
    buttons: [
      'colvis',
      {
        extend: 'copy',
        text: 'Copy',
        exportOptions: {
          columns: ':visible',
        },
      },
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
      },
    ],
    columnDefs: [
      { targets: [0, 3], visible: false },
      { targets: [1, 2, 3], searchable: true },
      { targets: '_all', searchable: false, visible: true },
    ],
  };
  /*table structure END*/

  constructor(
    private apiService: ApiService,
    private menuController: MenuController,
    private alertController: AlertController
  ) {}

  @ViewChild(DataTableDirective, { static: false })
  datatableElement: DataTableDirective;

  async ngOnInit() {
    await this.apiService
      .getTickets()
      .toPromise()
      .then((data) => {
        this.tickets = data;
      });
    if (this.tickets.data) {
      this.old_current_page = this.current_page =
        this.tickets.meta.current_page;
      this.old_last_page = this.last_page = this.tickets.meta.last_page;
      this.rows = this.tickets.data;
      this.formatTableData(this.rows);
      this.isTicketsLoaded = true;
    }
  }

  async searchTable(value: string) {
    value = value.replace(' ', '');
    if (!value) return;
    const dt = await this.datatableElement.dtInstance;
    if (!this.isSearching) {
      this.isSearching = true;
      this.old_current_page = this.current_page;
      this.old_last_page = this.last_page;
      this.old_table_data = dt.rows().data();
    }
    dt.rows().remove();
    this.search_phrase = value + '';

    this.tickets = await this.apiService
      .getTickets(1, 10, 'DESC', this.search_phrase)
      .toPromise();
    if (this.tickets && this.tickets.data) {
      this.current_page = this.tickets.meta.current_page;
      this.last_page = this.tickets.meta.last_page;
      let new_data = this.tickets.data;
      let new_rows = this.formatTableData(new_data);
      this.addNewTableData(new_rows);
    }
  }

  async resetTable(value: string = '') {
    value = value.replace(' ', '');
    if (value || !this.isSearching || !this.old_table_data) return;
    this.search_phrase = '';
    const dt = await this.datatableElement.dtInstance;

    this.isSearching = false;
    this.current_page = this.old_current_page;
    this.last_page = this.old_last_page;
    dt.rows().remove();
    dt.rows.add(this.old_table_data).draw();
    this.old_table_data = null;
  }

  async exportAs(index: number) {
    this.datatableElement.dtInstance.then((dtInstance: any) => {
      dtInstance.table().button(index).trigger();
    });
  }

  async loadData(event) {
    console.log('Done');
    if (this.current_page < this.last_page) {
      this.tickets = null;
      await this.apiService
        .getTickets(this.current_page + 1, 10, 'DESC', this.search_phrase)
        .toPromise()
        .then((data) => {
          this.tickets = data;
          console.log(
            '🚀 ~ file: tickets.page.ts ~ line 118 ~ TicketsPage ~ .then ~ this.tickets',
            this.tickets
          );
        });
      if (this.tickets.data) {
        this.current_page = this.tickets.meta.current_page;
        this.last_page = this.tickets.meta.last_page;
        if (!this.isSearching) {
          this.old_current_page = this.current_page;
          this.old_last_page = this.last_page;
        }
        let new_data = this.tickets.data;
        let new_rows = this.formatTableData(new_data);
        this.addNewTableData(new_rows);
        console.log(
          '🚀 ~ file: tickets.page.ts ~ line 127 ~ TicketsPage ~ loadData ~ this.rows',
          this.rows
        );
        console.log(this.current_page + ' ' + this.last_page);
        event.target.complete();
      }
    } else {
      event.target.complete();
    }
  }

  private formatTableData(data: any[]) {
    let n, x;
    let to_add = [];
    data.forEach((e) => {
      e.number = e.number.replace('#', '');
      n = `${e.violator.last_name}, ${e.violator.first_name}, ${e.violator.middle_name}`;
      e.violator.name = n;
      x = e.violations.map(({ violation }) => violation);
      let violations = '';
      for (let i = 0; i < x.length; i++) {
        violations = violations + x[i] + ', ';
      }
      e.violations = violations;
      let new_row = [
        e.id,
        e.number,
        e.violator.name,
        e.violator.license_number,
        e.violations,
        e.apprehension_datetime,
        e.issued_by,
      ];
      to_add.push(new_row);
    });
    return to_add;
  }

  private addNewTableData(data: any[]) {
    this.datatableElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.rows.add(data);
      console.log(
        '🚀 ~ file: tickets.page.ts ~ line 159 ~ TicketsPage ~ this.datatableElement.dtInstance.then ~ dtInstance.data()',
        dtInstance.data()
      );
      dtInstance.rows().draw();
    });
  }

  async toggleColumnVisibility(index: number) {
    const v = await this.isVisible(index);
    this.datatableElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.column(index).visible(!v);
    });
  }

  async isVisible(index: number) {
    const s = (await this.datatableElement.dtInstance).column(index).visible();
    return s;
  }

  async showSideMenu(menuId: string) {
    this.menuController.toggle(menuId);
  }
}

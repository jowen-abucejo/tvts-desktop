import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DataTableDirective } from 'angular-datatables';
import { IonContent, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.page.html',
  styleUrls: ['./tickets.page.scss'],
})
export class TicketsPage implements OnInit {
  hasScrollbar = false;

  // checks if there's a scrollbar when the user resizes the window or zooms in/out
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkForScrollbar();
  }

  tickets;
  isTicketsLoaded = false;
  current_page: number = 1;
  last_page: number = 1;
  search_phrase = '';
  private old_table_data: any;
  private old_current_page = 0;
  private old_last_page = 0;
  private isSearching = false;
  toggleModels = [false, true, true, false, true, true, true, false];

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
        orientation: 'landscape',
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
      { targets: [0, 3, 7], visible: false },
      { targets: [1, 2, 3], searchable: true },
      { targets: '_all', searchable: false, visible: true },
    ],
  };
  /*table structure END*/

  constructor(
    private apiService: ApiService,
    private menuController: MenuController
  ) {}

  @ViewChild(DataTableDirective, { static: false })
  datatableElement: DataTableDirective;
  @ViewChild('tableContent', { static: false }) private content: IonContent;

  async ngOnInit() {
    this.tickets = await this.apiService.getTickets(1, 15).toPromise();
    if (this.tickets.data) {
      this.old_current_page = this.current_page =
        this.tickets.meta.current_page;
      this.old_last_page = this.last_page = this.tickets.meta.last_page;
      this.rows = this.tickets.data;
      this.formatTableData(this.rows);
      this.isTicketsLoaded = true;
    }
    this.checkForScrollbar();
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

  async loadData(event?) {
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
        event?.target.complete();
      }
    } else {
      event?.target.complete();
    }
  }

  private formatTableData(data: any[]) {
    let n, x;
    let to_add = [];
    data.forEach((e) => {
      n = `${e.violator.last_name}, ${e.violator.first_name}, ${e.violator.middle_name}`;
      e.violator.name = n;
      x = e.violations.map(({ violation }) => violation);
      let violations = '';
      for (let i = 0; i < x.length; i++) {
        violations = violations + x[i] + ', ';
      }
      e.violations = violations.toUpperCase();
      let new_row = [
        e.id + ''.toUpperCase(),
        e.number + ''.toUpperCase(),
        e.violator.name.toUpperCase(),
        e.violator.license_number + ''.toUpperCase(),
        e.violations + ''.toUpperCase(),
        e.apprehension_datetime + ''.toUpperCase(),
        e.issued_by + ''.toUpperCase(),
        e.status_text + ''.toUpperCase(),
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
    const v = (await this.datatableElement.dtInstance).column(index).visible();
    this.datatableElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.column(index).visible(!v);
    });
  }

  async showSideMenu(menuId: string) {
    this.menuController.toggle(menuId);
    const dt = await this.datatableElement.dtInstance;
    console.log(dt.data());
  }

  async tableClick(event) {
    event.preventDefault();
    const dtInstance = await this.datatableElement.dtInstance;
    const row_index = event.srcElement._DT_CellIndex.row;
    const id = dtInstance.data()[row_index][0];
    const tn = dtInstance.data()[row_index][1];
    alert(id + ' ' + tn);
  }

  async checkForScrollbar() {
    const scrollElement = await this.content.getScrollElement();
    while (!this.hasScrollbar && this.current_page < this.last_page) {
      console.log(
        '🚀 ~ file: tickets.page.ts ~ line 259 ~ TicketsPage ~ checkForScrollbar ~ scrollElement',
        scrollElement
      );
      this.hasScrollbar =
        scrollElement.scrollHeight > scrollElement.clientHeight;
      console.log(
        '🚀 ~ file: tickets.page.ts ~ line 264 ~ TicketsPage ~ checkForScrollbar ~ scrollElement.clientHeight',
        scrollElement.clientHeight
      );
      console.log(
        '🚀 ~ file: tickets.page.ts ~ line 264 ~ TicketsPage ~ checkForScrollbar ~ scrollElement.scrollHeight ',
        scrollElement.scrollHeight
      );
      console.log(
        '🚀 ~ file: tickets.page.ts ~ line 260 ~ TicketsPage ~ checkForScrollbar ~ this.hasScrollbar',
        this.hasScrollbar
      );
      await this.loadData();
    }
  }
}

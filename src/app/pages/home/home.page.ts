import { Component, OnInit, ViewChild } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  public chart_statistics = {
    total_tickets: 0,
    total_violations: 0,
    violations: [],
    count_per_violations: [],
    offenses_and_violators: [],
  };
  public all_time_statistics = {
    total_tickets: 0,
    total_violations: 0,
    violations: [],
    count_per_violations: [],
    offenses_and_violators: [],
  };
  private page_data;
  private all_violations;
  private latest_violations;
  public isTicketCountLoaded = false;

  /*chart structure START HERE*/
  public lineChartType: ChartType = 'bar';
  @ViewChild(BaseChartDirective) baseChart: BaseChartDirective;

  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Issued Tickets',
        borderColor: '#3171e0',
        backgroundColor: '#3171e0',
        hoverBackgroundColor: '#eb445a',
        pointBorderColor: '#eb445abf',
        pointHoverBorderColor: '#eb445a',
        pointBackgroundColor: '#eb445a',
        pointHoverBackgroundColor: '#eb445a',
        fill: 'origin',
      },
    ],
    labels: [],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0,
      },
    },
    scales: {
      // We use this empty structure as a placeholder for dynamic theming.
      x: {},
      'y-axis-0': {
        position: 'left',
        grid: {
          color: 'rgba(255,0,0,0.3)',
        },
        ticks: {
          color: 'red',
        },
      },
    },

    plugins: {
      legend: { display: false },
      title: {
        display: true,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    onClick: null,
    onHover: null,
  };
  /*chart structure END*/

  /*table structure START HERE*/
  rows = [];
  dtOptions = {
    paging: false,
    responsive: true,
    searching: false,
    ordering: false,
    autoWidth: true,
    info: false,
  };
  /*table structure END*/

  constructor(
    private menuController: MenuController,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    //fetch data to be use by page from api
    this.menuController.open('side-menu');
    await this.apiService.getTicketCountByDate().then((data) => {
      this.page_data = data;
    });

    //check if chart data is available
    if (this.page_data.data.ticket_count) {
      this.lineChartData.datasets[0].data =
        this.page_data.data.ticket_count.map(
          ({ total_tickets }) => total_tickets
        );
      this.lineChartData.labels = this.page_data.data.ticket_count.map(
        ({ day }) => day
      );
      // }
      this.lineChartOptions.plugins.title.text =
        this.page_data.data.date.month +
        ' ' +
        this.page_data.data.date.year +
        ' Issued Tickets Overview';
      this.isTicketCountLoaded = true;
    }

    //assign data to be display in table
    this.rows = this.page_data.data.tickets ?? [];
    let x;
    this.rows.forEach((e) => {
      x = e.violations.map(({ violation }) => violation);
      e.violations = x;
    });

    //store all ticket count grouped by violations
    this.all_violations =
      this.page_data.data?.violation_count?.all_violation_ticket_count; //number of tickets for each violation

    //store latest ticket count grouped by violations
    this.latest_violations =
      this.page_data.data?.violation_count?.violation_ticket_count_within_date; //number of tickets for each violation within the period covered in chart

    this.chart_statistics.total_tickets = this.rows.length; //total tickets in chart
    this.chart_statistics.violations = this.latest_violations;
    this.chart_statistics.total_violations = this.latest_violations
      .map(({ total_tickets }) => total_tickets)
      .reduce((acc, cur) => acc + cur, 0); //total number of violations for all tickets issued within the period covered in chart
    this.chart_statistics.count_per_violations =
      this.page_data.data?.violation_count?.violation_ticket_count_within_date; //number of tickets for each violation within the period covered in chart
    this.chart_statistics.offenses_and_violators =
      this.page_data.data?.violator_count?.violator_ticket_count_within_date; //number of tickets for each violator within the period covered in chart

    this.all_time_statistics.total_tickets = this.page_data.all_ticket_count; //total number of issued tickets
    this.all_time_statistics.total_violations = this.all_violations
      .map(({ total_tickets }) => total_tickets)
      .reduce((acc, cur) => acc + cur, 0); //total number of violations for all issued tickets
    this.all_time_statistics.violations = this.all_violations;
    this.all_time_statistics.count_per_violations =
      this.page_data.data?.violation_count?.all_violation_ticket_count; //number of tickets for each violation
    this.all_time_statistics.offenses_and_violators =
      this.page_data.data?.violator_count?.all_violator_ticket_count; //number of tickets for each violator
  }
}

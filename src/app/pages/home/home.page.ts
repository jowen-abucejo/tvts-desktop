import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { UtilityService } from '../../services/utility.service';
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
  private page_data;
  private latest_violations;
  public isTicketCountLoaded = false;

  /*chart structure START HERE*/
  public chartType: ChartType = 'bar';
  @ViewChild(BaseChartDirective) baseChart: BaseChartDirective;

  public chartData: ChartConfiguration['data'] = {
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

  public chartOptions: ChartConfiguration['options'] = {
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
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  async ngOnInit() {
    //fetch data to be use by page from api
    const data = await this.apiService.getTicketCountByDate().catch((res) => {
      this.utility.alertErrorStatus(res, true, true);
      return null;
    });
    if (!data) return;
    this.page_data = data.data;
    this.prepareChartData();
    this.prepareTableData();

    //store latest ticket count grouped by violations
    this.latest_violations = this.page_data?.violation_count; //number of tickets for each violation within the period covered in chart

    this.showRecentRecordsTally();
  }

  prepareChartData() {
    if (this.page_data.daily_ticket) {
      this.chartData.datasets[0].data = this.page_data.daily_ticket.map(
        ({ total_tickets }) => total_tickets
      );
      this.chartData.labels = this.page_data.daily_ticket.map(({ day }) => day);
      this.chartOptions.plugins.title.text =
        this.page_data.date.month +
        ' ' +
        this.page_data.date.year +
        ' Issued Tickets Overview';
      this.isTicketCountLoaded = true;
    }
  }

  prepareTableData() {
    //assign data to be display in table
    this.rows = this.page_data.tickets ?? [];
    let x;
    this.rows.forEach((e) => {
      x = e.violations.map(({ violation }) => violation);
      e.violations = x;
    });
  }

  reloadPage() {
    this.chart_statistics = {
      total_tickets: 0,
      total_violations: 0,
      violations: [],
      count_per_violations: [],
      offenses_and_violators: [],
    };
    this.page_data;
    this.latest_violations;
    this.isTicketCountLoaded = false;
    this.ngOnInit();
  }

  async showRecentRecordsTally() {
    this.chart_statistics.total_tickets = this.rows.length; //total tickets in chart
    this.chart_statistics.violations = this.latest_violations;
    this.chart_statistics.total_violations = this.latest_violations
      .map(({ total_tickets }) => total_tickets)
      .reduce((acc, cur) => acc + cur, 0); //total number of violations for all tickets issued within the period covered in chart
    this.chart_statistics.count_per_violations =
      this.page_data?.violation_count; //number of tickets for each violation within the period covered in chart
    this.chart_statistics.offenses_and_violators =
      this.page_data?.violator_count; //number of tickets for each violator within the period covered in chart
  }
}

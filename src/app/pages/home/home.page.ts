import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { UtilityService } from '../../services/utility.service';
import { ApiService } from '../../services/api.service';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { PopoverController } from '@ionic/angular';
import { PopoverComponent } from 'src/app/modules/shared/popover/popover.component';

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
  dateRangeFormGroup: FormGroup = new FormGroup({
    start_date: new FormControl('', Validators.required),
    end_date: new FormControl('', [
      Validators.required,
      this.dateRangeValid('start_date'),
    ]),
  });

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
    private utility: UtilityService,
    private popoverController: PopoverController
  ) {}

  async ngOnInit() {
    this.dateRangeFormGroup.controls.start_date.valueChanges.subscribe(() => {
      this.dateRangeFormGroup.controls.end_date.updateValueAndValidity();
    });
    this.fetchData();
  }

  async applyDateFilter() {
    const loading = await this.utility.createIonLoading();
    loading.present();
    await this.popoverController.dismiss('dateRangeFilter');
    const range = [
      this.dateRangeFormGroup.get('start_date').value,
      this.dateRangeFormGroup.get('end_date').value,
    ];
    await this.fetchData(range);
    loading.dismiss();
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

  async fetchData(range = null) {
    const data = await this.apiService
      .getTicketCountByDate(range)
      .catch((res) => {
        this.utility.alertErrorStatus(res, true, true);
        return null;
      });
    if (!data) return;
    this.page_data = data.data;
    this.prepareChartData();
    this.prepareTableData();

    //store latest ticket count grouped by violations
    this.latest_violations = this.page_data?.violation_count; //number of tickets for each violation within the period covered in chart

    await this.showRecentRecordsTally();
  }

  prepareChartData() {
    if (this.page_data.daily_ticket) {
      const days = this.page_data.daily_ticket.length - 1;
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

      if (days >= 0) {
        this.dateRangeFormGroup.controls.start_date.setValue(
          this.page_data.daily_ticket[0].day_order
        );
        this.dateRangeFormGroup.controls.end_date.setValue(
          this.page_data.daily_ticket[days].day_order
        );
      }
      this.baseChart?.update();
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

  async promptDateFilter(ev) {
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

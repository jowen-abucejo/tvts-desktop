import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-custom-footer',
  templateUrl: './custom-footer.component.html',
  styleUrls: ['./custom-footer.component.scss'],
})
export class CustomFooterComponent implements OnInit {
  current_year = new Date().getFullYear();

  constructor() {}

  ngOnInit() {}
}

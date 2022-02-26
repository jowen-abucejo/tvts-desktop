import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
export const API_KEY = '_api';
export const SU_KEY = '_su';
export const API_URL = {
  REQUEST_TOKEN: `users/user/login`,
  REQUEST_LOGOUT: `users/user/logout`,
  CONFIRM_PASSWORD: `users/user/confirm-password`,
  GROUPED_VIOLATIONS_AND_VEHICLE_TYPES: `violations/types/by-vehicle-types`,
  GET_ONE_VIOLATOR: `violators/violator`,
  STORE_TICKET_DETAILS: `tickets/new`,
  GET_ONE_TICKET: `tickets/ticket`,
  GET_TICKETS: `tickets`,
  GET_TICKET_COUNT_BY_DATE: `tickets/count/by-date`,
  GET_EXTRA_INPUTS: `forms/ext/fields`,
  UPDATE_USER: `users/user`,
  EMAIL_QRCODE: `tickets/email-qr`,
  GET_IMAGE: `resources/image`,
  GET_VIOLATIONS: `violations`,
};
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private api = { domain: '', version: '' };
  constructor(private http: HttpClient, private auth: AuthenticationService) {
    this.auth.api
      .pipe(
        map((api) => {
          this.api = api;
        })
      )
      .subscribe();
  }

  /**
   * Get violator's details with the associated license_number or name and birth date
   * @param formData Form Data with the license number or name and birth date of violator
   * @returns Returns a promise that resolves with an object of violator's details
   */
  getViolatorDetails(formData: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_VIOLATOR}`,
        formData,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  /**
   * Get violations grouped by vehicle type
   * @returns Returns a promise with an object consist of violations grouped by vehicle type
   */
  getViolationsByVehicleType() {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GROUPED_VIOLATIONS_AND_VEHICLE_TYPES}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  /**
   * Create record of ticket with the given details
   * @param {FormData} details details about the ticket
   * @returns Returns a promise with an object of the created ticket
   */
  saveTicket(details: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.STORE_TICKET_DETAILS}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  /**
   * Get the ticket details associated with the given ticket number
   * @param ticket_number the number to identify the ticket
   * @returns Returns a promise that resolves with an object of ticket details
   */
  getTicketDetails(ticket_number: any) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_TICKET}/${ticket_number}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  /**
   * Get records of tickets based on the given parameters
   * @param page page number
   * @param limit number of records per page
   * @param order sorting of records — ASC or DESC
   * @param search phrase to search
   * @returns Returns an observable with an object consist of query results
   */
  getTickets(
    page: number = 1,
    limit: number = 10,
    order: string = 'DESC',
    search: string = '',
    date_range = null,
    max_fetch_date: any = '',
    max_date_paginated: any = ''
  ) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_TICKETS}`,
        {
          headers: this.auth.createHeaderWithToken(),
          params: {
            page,
            limit,
            order,
            search,
            start_date: date_range ? date_range[0] : '',
            end_date: date_range ? date_range[1] : '',
            max_fetch_date,
            max_date_paginated,
          },
        }
      )
      .toPromise();
  }

  /**
   * Get total number of tickets for each day within the given month and year
   * @param year year the ticket was issued
   * @param month month the ticket was issued
   * @returns Returns a promise that resolves with an object consist of total number of tickets for each day within the given month and year
   */
  getTicketCountByDate(year: number = 0, month: number = 0) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_TICKET_COUNT_BY_DATE}`,
        {
          headers: this.auth.createHeaderWithToken(),
          params: {
            year,
            month,
          },
        }
      )
      .toPromise();
  }

  /**
   * Get all extra inputs to display in form
   * @param target the owner('violator' or 'ticket') of extra properties represented by all extra inputs
   * @returns Returns a promise that resolves with an object consist of extra inputs' description
   */
  getExtraInputs(target: string) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_EXTRA_INPUTS}/${target}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  updateAccount(formData: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.UPDATE_USER}`,
        formData,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  sendQRToEmail(ticket_number: any, qr_image: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.EMAIL_QRCODE}/${ticket_number}`,
        qr_image,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  confirmPassword(password: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.CONFIRM_PASSWORD}`,
        password,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  requestImage(url) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_IMAGE}/${url}`,
        {
          headers: this.auth.createHeaderWithToken(),
          responseType: 'blob',
        }
      )
      .toPromise();
  }

  getViolations(page = 1, limit = 10, order = 'ASC', search = '') {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_VIOLATIONS}`,
        {
          headers: this.auth.createHeaderWithToken(),
          params: {
            page,
            limit,
            order,
            search,
          },
        }
      )
      .toPromise();
  }

  /**
   * Update record of ticket with the given details
   * @param {FormData} details updated details of ticket
   * @param ticket_id id of the ticket to update
   * @returns Returns a promise with the status of update
   */
  updateTicket(details: FormData, ticket_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_TICKET}/${ticket_id}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  /**
   * Update record of violator with the given details
   * @param details updated details of violator
   * @param violator_id id of the violator to update
   * @returns Returns a promise with the status of update
   */
  updateViolator(details: FormData, violator_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_VIOLATOR}/${violator_id}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }
}

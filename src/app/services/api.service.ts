import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
export const API_KEY = '_api';
export const SU_KEY = '_su';
export const API_URL = {
  GET_USERS: `users`,
  STORE_USER_DETAILS: `users/new`,
  GET_ONE_USER: `users/user`,
  REQUEST_TOKEN: `users/user/login`,
  REQUEST_LOGOUT: `users/user/logout`,
  CONFIRM_PASSWORD: `users/user/confirm-password`,
  UPDATE_USER: `users/user`,

  GET_VIOLATIONS: `violations`,
  STORE_VIOLATION_DETAILS: `violations/new`,
  GET_ONE_VIOLATION: `violations/violation`,
  GROUPED_VIOLATIONS_AND_VEHICLE_TYPES: `violations/types/by-vehicle-types`,

  GET_ONE_VIOLATOR: `violators/violator`,

  GET_TICKETS: `tickets`,
  STORE_TICKET_DETAILS: `tickets/new`,
  GET_ONE_TICKET: `tickets/ticket`,
  GET_TICKET_COUNT_BY_DATE: `tickets/count/by-date`,
  EMAIL_QRCODE: `tickets/email-qr`,

  GET_EXTRA_INPUTS: `forms/ext/input/fields`,
  GET_ONE_EXTRA_INPUT: `forms/ext/input/field`,

  GET_IMAGE: `resources/image`,

  GET_PAYMENTS: `payments`,
  STORE_PAYMENT_DETAILS: `payments/new`,
  GET_ONE_PAYMENT: `payments/payment`,
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
    ticket_number = encodeURIComponent(ticket_number);
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
            search: encodeURIComponent(search),
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
   * @param search the keyword to search
   * @returns Returns a promise that resolves with an object consist of extra inputs' description
   */
  getExtraInputs(target: string = null, search: string = '') {
    let url = target
      ? `${this.api.domain}/api/${this.api.version}/${API_URL.GET_EXTRA_INPUTS}/${target}`
      : `${this.api.domain}/api/${this.api.version}/${API_URL.GET_EXTRA_INPUTS}`;
    return this.http
      .get(url, {
        headers: this.auth.createHeaderWithToken(),
        params: {
          search: encodeURIComponent(search),
        },
      })
      .toPromise();
  }

  /**
   *
   * @param formData updated username and password, new password confirmation and the current password for the current user account
   * @returns Returns a promise with the status if update is successful or not
   */
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

  /**
   *
   * @param ticket_number the ticket number of generated image
   * @param qr_image the generated citation ticket
   * @returns Returns a promise with the status if ticket is emailed successfully
   */
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

  /**
   *
   * @param password the password to be matched with the current user account
   * @returns Returns a promise with the result if password is matched to the account
   */
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

  /**
   *
   * @param url the path of the requested image
   * @returns Returns a promise with blob of the requested image
   */
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
            search: encodeURIComponent(search),
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

  deleteTicket(ticket_id: number) {
    return this.http
      .delete(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_TICKET}/delete/${ticket_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
          body: { _method: 'DELETE' },
        }
      )
      .toPromise();
  }

  deleteViolation(violation_id: number, violation_type_id: number) {
    return this.http
      .delete(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_VIOLATION}/delete/${violation_id}/${violation_type_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
          body: { _method: 'DELETE' },
        }
      )
      .toPromise();
  }

  toggleViolationStatus(violation_id: number, violation_type_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_VIOLATION}/toggle/${violation_id}/${violation_type_id}`,
        { _method: 'PATCH' },
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  getViolationDetails(violation_id: number, violation_type_id: number) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_VIOLATION}/${violation_id}/${violation_type_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  /**
   * Create record of violation with the given details
   * @param {FormData} details details about the violation
   * @returns Returns a promise with an object of the created violation
   */
  saveViolation(details: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.STORE_VIOLATION_DETAILS}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  updateViolation(details: FormData, violation_id: number, violation_type_id) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_VIOLATION}/${violation_id}/${violation_type_id}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  getPayments(
    page: number = 1,
    limit: number = 10,
    order: string = 'ASC',
    search: string = '',
    date_range = null,
    max_fetch_date: any = '',
    max_date_paginated: any = ''
  ) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_PAYMENTS}`,
        {
          headers: this.auth.createHeaderWithToken(),
          params: {
            page,
            limit,
            order,
            search: encodeURIComponent(search),
            start_date: date_range ? date_range[0] : '',
            end_date: date_range ? date_range[1] : '',
            max_fetch_date,
            max_date_paginated,
          },
        }
      )
      .toPromise();
  }

  getPaymentDetails(payment_id: number) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_PAYMENT}/${payment_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  deletePayment(payment_id: number) {
    return this.http
      .delete(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_PAYMENT}/delete/${payment_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
          body: { _method: 'DELETE' },
        }
      )
      .toPromise();
  }

  /**
   * Create record of payment with the given details
   * @param {FormData} details details about the payment
   * @returns Returns a promise with an object of the created payment
   */
  savePayment(details: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.STORE_PAYMENT_DETAILS}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  updatePayment(details: FormData, payment_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_PAYMENT}/${payment_id}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  getUserAccounts(
    page = 1,
    limit = 10,
    order = 'ASC',
    search = '',
    fetch_all: boolean = false
  ) {
    return this.http
      .get(`${this.api.domain}/api/${this.api.version}/${API_URL.GET_USERS}`, {
        headers: this.auth.createHeaderWithToken(),
        params: {
          page,
          limit,
          order,
          search: encodeURIComponent(search),
          fetch_all,
        },
      })
      .toPromise();
  }

  deleteUserAccount(payment_id: number, permanentDelete: boolean = false) {
    return this.http
      .delete(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_USER}/delete/${payment_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
          body: { _method: 'DELETE', permanentDelete: permanentDelete },
        }
      )
      .toPromise();
  }

  /**
   * Create record of user with the given details
   * @param {FormData} details details about the user
   * @returns Returns a promise with an object of the created user
   */
  saveUserAccount(details: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.STORE_USER_DETAILS}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  updateUserAccount(details: FormData, user_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_USER}/${user_id}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  resetUserAccountLogin(user_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_USERS}/reset/${user_id}`,
        { _method: 'PUT' },
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  getUserAccountDetails(user_id: number) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_USER}/${user_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  getExtraInputDetails(extra_input_id: number) {
    return this.http
      .get(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_EXTRA_INPUT}/${extra_input_id}}`,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  deleteExtraInput(
    extra_property_id: number,
    permanentDelete: boolean = false
  ) {
    return this.http
      .delete(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_EXTRA_INPUT}/delete/${extra_property_id}`,
        {
          headers: this.auth.createHeaderWithToken(),
          body: { _method: 'DELETE', permanentDelete: permanentDelete },
        }
      )
      .toPromise();
  }

  /**
   * Create record of extra input field with the given details
   * @param {FormData} details details about the extra input field
   * @returns Returns a promise with an object of the created extra input field
   */
  saveExtraInputDetails(details: FormData) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_EXTRA_INPUT}/new`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }

  updateExtraInput(details: FormData, extra_input_id: number) {
    return this.http
      .post(
        `${this.api.domain}/api/${this.api.version}/${API_URL.GET_ONE_EXTRA_INPUT}/${extra_input_id}`,
        details,
        {
          headers: this.auth.createHeaderWithToken(),
        }
      )
      .toPromise();
  }
}

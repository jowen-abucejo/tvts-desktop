import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { API_URL } from './api.service';
import { ConfigService } from './config.service';
import { StorageService, TOKEN_KEY } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  isAuthenticated: BehaviorSubject<boolean> = new BehaviorSubject(null);
  isSuAuthenticated: BehaviorSubject<boolean> = new BehaviorSubject(null);
  public token: any = {};
  public api: BehaviorSubject<{ domain: string; version: string }> =
    new BehaviorSubject({ domain: '', version: '' });
  private api_object = { domain: '', version: '' };
  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private config: ConfigService
  ) {
    this.loadToken();
    this.api
      .pipe(
        map((api) => {
          this.api_object = api;
        })
      )
      .subscribe();

    this.config.getApiDomain().then((data) => {
      this.api.next(data);
    });
  }

  createHeaderWithToken() {
    const header = new HttpHeaders({
      Accept: 'application/json',
      Authorization: `${this.token.data.token_type} ${this.token.data.access_token}`,
    });
    return header;
  }

  createHeaderWithOutToken() {
    const header = new HttpHeaders({
      Accept: 'application/json',
    });
    return header;
  }

  async loadToken(logout_fallback: boolean = true) {
    const token_stored = await this.storage
      .get(TOKEN_KEY)
      .pipe(take(1))
      .toPromise();
    this.token = JSON.parse(token_stored);
    if (this.token !== null && this.token.expired_at > Date.now()) {
      this.isAuthenticated.next(true);
    } else {
      logout_fallback ? this.logout() : '';
    }
  }

  async isSuperuser(username: string, password: string) {
    const su = await this.config.getSuperUser();
    if (su.username == username && su.password == password) {
      this.isSuAuthenticated.next(true);
      return true;
    } else {
      return false;
    }
  }

  login(username: string, password: string, re_login: boolean = false) {
    let url = `${this.api_object?.domain}/api/${API_URL.REQUEST_TOKEN}`;
    const body = {
      username: username,
      password: password,
      api_version: this.api_object?.version,
    };
    return this.http
      .post(url, body, {
        headers: this.createHeaderWithOutToken(),
      })
      .pipe(
        take(1),
        map((data: any) => {
          return data;
        }),
        switchMap(async (data) => {
          await this.storage.set(
            TOKEN_KEY,
            JSON.stringify({
              data,
              expired_at: Date.now() + data.expires_in,
            })
          );
          return from(this.loadToken(!re_login));
        }),
        tap((_) => {
          this.isAuthenticated.next(true);
        })
      )
      .toPromise();
  }

  async logout() {
    if (this.token) {
      this.http
        .post(
          `${this.api_object.domain}/api/${this.api_object.version}/${API_URL.REQUEST_LOGOUT}`,
          {},
          {
            headers: this.createHeaderWithToken(),
          }
        )
        .toPromise()
        .catch(() => {});
    }
    this.storage.remove(TOKEN_KEY);
    this.isAuthenticated.next(false);
    return true;
  }
}

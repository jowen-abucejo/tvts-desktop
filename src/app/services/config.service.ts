import { Injectable } from '@angular/core';
import { take } from 'rxjs/operators';
import { API_KEY, SU_KEY } from './api.service';
import { StorageService } from './storage.service';
@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private domain_url: string = null;
  private api_version: string = null;

  constructor(private storage: StorageService) {
    this.init();
  }

  /**
   * Set initial/default configuration for this application
   */
  private async init() {
    let u = '',
      p = '';
    await this.getApiDomain().then((data) => {
      this.domain_url = data?.domain;
      this.api_version = data?.version;
    });
    await this.getSuperUser().then((data) => {
      u = data?.username;
      p = data?.password;
    });
    if (this.domain_url) {
      await this.configureApiDomain(this.domain_url, this.api_version);
    } else {
      await this.configureApiDomain(
        // 'https://dry-citadel-29932.herokuapp.com',
        'http://127.0.0.1:8000',
        'v1'
      ); //default api version
    }
    this.configureSuperUser(u, p);
  }

  /**
   * Set superuser account details
   * @param su_username username for superuser
   * @param su_password password for superuser
   */
  async configureSuperUser(su_username?: any, su_password?: any) {
    let u =
      su_username === null || su_username === undefined
        ? 'superuser'
        : su_username;
    let p =
      su_password === null || su_password === undefined
        ? 'superuser'
        : su_password;
    let superuser = { username: u, password: p };
    await this.storage.set(SU_KEY, JSON.stringify(superuser));
  }

  /**
   * Set API for this app to connect to
   * @param domain
   * @param version
   * @param reload
   */
  async configureApiDomain(
    domain: string,
    version: string,
    reload: boolean = false
  ) {
    let d = domain ? domain : '';
    let v = version ? version : '';
    const api = { domain: d.replace(' ', ''), version: v.replace(' ', '') };
    await this.storage.set(API_KEY, JSON.stringify(api));
  }

  /**
   * Get the superuser account details
   * @returns Returns an object of superuser
   */
  async getSuperUser() {
    let superuser = { username: '', password: '' };
    superuser = JSON.parse(
      await this.storage.get(SU_KEY).pipe(take(1)).toPromise()
    );
    return superuser;
  }

  /**
   * Get the API details this app connect to
   * @returns Returns an object of API
   */
  async getApiDomain() {
    let api = { domain: '', version: '' };
    api = JSON.parse(await this.storage.get(API_KEY).pipe(take(1)).toPromise());
    return api;
  }
}

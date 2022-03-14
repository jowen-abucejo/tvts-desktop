import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonSlides } from '@ionic/angular';
import { INTRO_KEY } from '../../guards/intro.guard';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
})
export class IntroPage implements OnInit {
  constructor(private router: Router, private storage: StorageService) {}

  ngOnInit() {}

  @ViewChild(IonSlides) slides: IonSlides;

  slidePrev() {
    this.slides.slidePrev();
  }
  slideNext() {
    this.slides.slideNext();
  }

  async goToLogin() {
    await this.storage.set(INTRO_KEY, true);
    this.router.navigateByUrl('login', { replaceUrl: true });
    return true;
  }
}

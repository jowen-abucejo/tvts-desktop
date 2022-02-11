import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// import { Directory, Filesystem } from '@capacitor/filesystem';
import { AlertController, ViewDidLeave } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';
export interface imageFile {
  property_name: string;
  name: string;
  data: any;
  path: string;
}
export const TMP_DIR = 'tmp_img/';
//delete image file
// export async function deleteImage(filepath: string) {
//   await Filesystem.deleteFile({
//     directory: Directory.Data,
//     path: filepath,
//   }).catch((err) => {});
// }

@Component({
  selector: 'app-custom-input',
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
})
export class CustomInputComponent implements OnInit, ViewDidLeave, OnDestroy {
  @Input() parentForm: FormGroup;
  @Input() type: string = 'text';
  @Input() controller!: string;
  @Input() placeholder: string = '';
  @Input() label: string = '';
  @Input() isMultipleSelect: boolean = false;
  @Input() options: string[] = [];
  @Input() alertOptions: any = {};
  @Input() disabled: boolean = false;
  @Output() toggleEvent = new EventEmitter<string>();
  @Output() imageCaptureEvent = new EventEmitter<imageFile>();

  input_types_cast = ['text', 'email'];
  imageData: any;
  base64: imageFile = {
    property_name: '',
    name: '',
    data: null,
    path: null,
  };

  constructor(
    private alertCtrl: AlertController,
    private apiService: ApiService
  ) {}
  ionViewDidLeave(): void {
    // delete saved image when page destroy
    if (this.base64.path) {
      // deleteImage(this.base64.path);
    }
  }

  ngOnInit() {
    if (this.disabled && this.type === 'image') {
      this.requestImage(this.parentForm.get(this.controller).value);
    }
  }

  ngOnDestroy() {
    // delete saved image when page destroy
    if (this.base64.path) {
      // deleteImage(this.base64.path);
    }
  }

  toggleValue() {
    this.toggleEvent.emit(this.controller);
  }

  // async captureImage() {
  //   const image = await Camera.getPhoto({
  //     quality: 90,
  //     allowEditing: false,
  //     resultType: CameraResultType.Base64,
  //     source: CameraSource.Camera,
  //   });

  //   this.base64.property_name = this.controller + '';
  //   this.base64.name = new Date().getTime() + '.jpeg';
  //   const filepath = TMP_DIR + this.base64.name;
  //   await Filesystem.writeFile({
  //     directory: Directory.Data,
  //     path: filepath,
  //     data: image.base64String,
  //     recursive: true,
  //   });

  //   //delete previous saved image if exist
  //   if (this.base64.path) {
  //     deleteImage(this.base64.path);
  //   }

  //   await this.showImage(filepath);

  //   this.imageCaptureEvent.emit(this.base64);
  // }

  // //read the saved image and show on thumbnail
  // private async showImage(filepath: string) {
  //   const bs64 = await Filesystem.readFile({
  //     directory: Directory.Data,
  //     path: filepath,
  //   });
  //   this.imageData = 'data:image/jpeg;base64,' + bs64.data;
  //   this.base64.data = this.imageData;
  //   this.base64.path = filepath;
  // }

  //view image upon clicking image thumbnail
  async zoomImage() {
    const alert = await this.alertCtrl.create({
      header: "Driver's ID",
      message: `<img src="${this.imageData}">`,
      buttons: [
        this.disabled
          ? ''
          : {
              text: 'Retake',
              cssClass: 'dark',
              handler: () => {
                // this.captureImage();
              },
            },
        {
          text: 'Ok',
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  private requestImage(image_path: string) {
    image_path = image_path.replace('/', ' ');
    this.apiService.requestImage(image_path).then(
      (image: any) => {
        this.createImageFromBlob(image);
      },
      (err) => {
        this.imageData = null;
      }
    );
  }

  private createImageFromBlob(image: Blob) {
    let reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        this.imageData = reader.result;
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }
}

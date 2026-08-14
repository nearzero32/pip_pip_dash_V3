import { Injectable } from '@angular/core';
import { axiosInstance } from '../core/axios.instance';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  readonly client = axiosInstance;
}

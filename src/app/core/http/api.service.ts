import { Injectable } from '@angular/core';
import { axiosInstance } from './axios.instance';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  readonly client = axiosInstance;
}

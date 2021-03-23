import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/map";
import "rxjs/add/operator/catch";

import * as io from "socket.io-client";
import { RoomsDto } from "./Models/rooms-model";

@Injectable()
export class AppService {
  public gameGrid = <Array<Object>>[
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  private BASE_URL = "http://localhost:4000";
  public socket;

  constructor(private http: HttpClient) {}

  public getRoomStats() {
    return new Promise((resolve) => {
      this.http.get(`http://localhost:4000/getRoomStats`).subscribe((data) => {
        resolve(data);
      });
    });
  }

  connectSocket() {
    this.socket = io(this.BASE_URL);
  }

  getAvailableRooms(): Observable<any> {
    const observable = new Observable((observer) => {
      this.socket.on("rooms-available", (data: RoomsDto) => {
        observer.next(data);
      });
      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }

  createNewRoom(): Observable<any> {
    this.socket.emit("create-room", { test: 9909 });
    const observable = new Observable((observer) => {
      this.socket.on("new-room", (data: RoomsDto) => {
        observer.next(data);
      });
      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }

  joinNewRoom(roomNumber): void {
    this.socket.emit("join-room", { roomNumber: roomNumber });
  }

  startGame(): Observable<any> {
    const observable = new Observable((observer) => {
      this.socket.on("start-game", (data) => {
        observer.next(data);
      });
      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }

  sendPlayerMove(params): void {
    this.socket.emit("send-move", params);
  }

  onReceivePlayerMove(): Observable<any> {
    const observable = new Observable((observer) => {
      this.socket.on("receive-move", (data) => {
        observer.next(data);
      });
      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }

  onPlayerLeft(): Observable<any> {
    const observable = new Observable((observer) => {
      this.socket.on("room-disconnect", (data) => {
        observer.next(data);
      });
      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }
}

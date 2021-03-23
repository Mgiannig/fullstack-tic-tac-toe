import { Component, Renderer, ViewChild, OnInit } from "@angular/core";
import { AppService } from "./app.service";
import { NgbModal, NgbModalOptions } from "@ng-bootstrap/ng-bootstrap";
import { RoomsDto } from "./Models/rooms-model";
import { PlayerMoveDto } from "./Models/player-move-model";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  providers: [AppService],
})
export class AppComponent implements OnInit {
  title = "Dynamo Demo";
  gameGrid: Object[] = [];
  playedGameGrid: Object[] = [];
  movesPlayed: number = 0;
  displayPlayerTurn = true;
  myTurn = true;
  iWillStart = true;

  @ViewChild("content") private content;
  private modalOption: NgbModalOptions = {};

  /*socket related Variable,ng-models and constant starts*/
  totalRooms: number = 0;
  emptyRooms = <Array<number>>[];
  roomNumber: number = 0;
  playedText = <string>"";
  whoseTurn = "X";

  constructor(
    private _renderer: Renderer,
    private modalService: NgbModal,
    private appService: AppService
  ) {
    this.gameGrid = appService.gameGrid;
  }

  ngOnInit() {
    /*As soon as the app loads, we display the welcome modal*/
    this.setModalOptions();
    const localModalRef = this.modalService.open(
      this.content,
      this.modalOption
    );

    this.appService.connectSocket();

    this.appService.getRoomStats().then((response: RoomsDto) => {
      this.totalRooms = response.totalRoomCount;
      this.emptyRooms = response.emptyRooms;
    });

    this.appService.getAvailableRooms().subscribe((response: RoomsDto) => {
      this.totalRooms = response.totalRoomCount;
      this.emptyRooms = response.emptyRooms;
    });

    this.appService.startGame().subscribe((response: RoomsDto) => {
      localModalRef.close();
      this.roomNumber = response.roomNumber;
    });

    this.appService
      .onReceivePlayerMove()
      .subscribe((response: PlayerMoveDto) => {
        this.opponentMove(response);
      });

    this.appService.onPlayerLeft().subscribe((response) => {
      alert("Player Left");
      window.location.reload();
    });
  }

  joinRoom(roomNumber) {
    this.myTurn = false;
    this.iWillStart = false;
    this.whoseTurn = "O";
    this.appService.joinNewRoom(roomNumber);
  }

  createRoom() {
    this.myTurn = true;
    this.whoseTurn = "X";
    this.iWillStart = true;
    this.appService.createNewRoom().subscribe((response) => {
      this.roomNumber = response.roomNumber;
    });
  }

  opponentMove(params: PlayerMoveDto): void {
    this.displayPlayerTurn = !this.displayPlayerTurn ? true : false;
    if (params.winner === null) {
      this.playedGameGrid[params["position"]] = {
        position: params.position,
        player: params.playedText,
      };
      this.myTurn = true;
    } else {
      alert(params.winner);
      this.resetGame();
    }
  }

  play(number: number): void {
    if (!this.myTurn) {
      return;
    }
    this.movesPlayed += 1;
    this.playedGameGrid[number] = {
      position: number,
      player: this.whoseTurn,
    };

    this.appService.sendPlayerMove({
      roomNumber: this.roomNumber,
      playedText: this.whoseTurn,
      position: number,
      playedGameGrid: this.playedGameGrid,
      movesPlayed: this.movesPlayed,
    });

    this.myTurn = false;
    this.displayPlayerTurn = !this.displayPlayerTurn ? true : false;
  }

  renderPlayedText(number) {
    if (this.playedGameGrid[number] === undefined) {
      return "";
    } else {
      this.playedText = this.playedGameGrid[number]["player"];
      return this.playedText;
    }
  }

  resetGame() {
    this.playedGameGrid = [];
    this.gameGrid = [];
    this.gameGrid = this.appService.gameGrid;
    this.movesPlayed = 0;
    if (this.iWillStart) {
      this.myTurn = true;
      this.displayPlayerTurn = true;
      this.whoseTurn = "X";
    } else {
      this.displayPlayerTurn = true;
      this.whoseTurn = "O";
    }
  }

  private setModalOptions() {
    this.modalOption.backdrop = "static";
    this.modalOption.keyboard = false;
    this.modalOption.size = "lg";
  }
}

import { Component, Renderer2, ViewChild, OnInit } from '@angular/core';
import { AppService } from './app.service';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import 'core-js/es7/reflect';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  providers: [AppService],
})
export class AppComponent implements OnInit {
  title: string = 'Realtime Tic Tac Toe Rooms and Namespaces';
  gameGrid: Object[] = [];
  playedGameGrid: any[] = [];
  movesPlayed: number = 0;
  displayPlayerTurn: boolean = true;
  myTurn: boolean = true;
  whoWillStart: boolean = true;

  @ViewChild('content') private content: any;
  private modalOption: NgbModalOptions = {};

  totalRooms: number = 0;
  emptyRooms: number[] = [];
  roomNumber: number = 0;
  playedText: any = '';
  whoseTurn: string = 'X';

  constructor(
    private _renderer: Renderer2,
    private modalService: NgbModal,
    private appService: AppService
  ) {
    this.gameGrid = appService.gameGrid;
  }

  ngOnInit() {
    this.modalOption.backdrop = 'static';
    this.modalOption.keyboard = false;
    this.modalOption.size = 'lg';
    const localModalRef = this.modalService.open(
      this.content,
      this.modalOption
    );
    this.appService.connectSocket();

    this.appService.getRoomStats().then((response: any) => {
      this.totalRooms = response['totalRoomCount'];
      this.emptyRooms = response['emptyRooms'];
    });

    // Socket evenet will total available rooms to play.
    this.appService.getRoomsAvailable().subscribe((response: any) => {
      this.totalRooms = response['totalRoomCount'];
      this.emptyRooms = response['emptyRooms'];
    });

    // Socket evenet to start a new Game
    this.appService.startGame().subscribe((response: any) => {
      localModalRef.close();
      this.roomNumber = response['roomNumber'];
    });

    // Socket event will receive the Opponent player's Move
    this.appService.receivePlayerMove().subscribe((response: any) => {
      this.opponentMove(response);
    });

    // Socket event to check if any player left the room, if yes then reload the page.
    this.appService.playerLeft().subscribe(() => {
      alert('Player Left');
      window.location.reload();
    });
  }

  /**
   * Method to join the new Room by passing Romm Number
   * @param roomNumber
   */ joinRoom(roomNumber: number) {
    this.myTurn = false;
    this.whoWillStart = false;
    this.whoseTurn = 'O';
    this.appService.joinNewRoom(roomNumber);
  }
  /**
   * Method create new room
   */ createRoom() {
    this.myTurn = true;
    this.whoseTurn = 'X';
    this.whoWillStart = true;
    this.appService.createNewRoom().subscribe((response: any) => {
      this.roomNumber = response.roomNumber;
    });
  }

  /**
   * This method will be called by the socket event subscriber to make the Opponent players moves
   * @param params
   */ opponentMove(params: any) {
    this.displayPlayerTurn = !this.displayPlayerTurn ? true : false;
    if (params['winner'] === null) {
      this.playedGameGrid[params['position']] = {
        position: params['position'],
        player: params['playedText'],
      };
      this.myTurn = true;
    } else {
      alert(params['winner']);
      this.resetGame();
    }
  }

  /**
   * This method will be called when the current user tries to play his/her move
   * Also we will send the socket event to the server.
   * @param number
   */ play(number: number) {
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
  /**
   * This method will be used to render the data between the Grids.
   * @param number
   */ renderPlayedText(number: any) {
    if (this.playedGameGrid[number] === undefined) {
      return '';
    } else {
      this.playedText = this.playedGameGrid[number]['player'];
      return this.playedText;
    }
  }
  /**
   * As the name suggests here in this method we will reset the game.
   */ resetGame() {
    this.playedGameGrid = [];
    this.gameGrid = [];
    this.gameGrid = this.appService.gameGrid;
    this.movesPlayed = 0;
    if (this.whoWillStart) {
      this.myTurn = true;
      this.displayPlayerTurn = true;
      this.whoseTurn = 'X';
    } else {
      this.displayPlayerTurn = true;
      this.whoseTurn = 'O';
    }
  }
}

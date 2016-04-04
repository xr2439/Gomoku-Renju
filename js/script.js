var size = 45;
var radius = size / 2 - 4;
var line_width = 2;
var title_height = 50;
var timeout = 30;
var col = 12, row = 12;

var player1 = "Player 1";
var player2 = "Player 2";
var player1_color = "#198cff";
var player2_color = "#c61236";
var color = player1_color;

var game_canvas = $("canvas")[0];
var game = game_canvas.getContext("2d");
var anim_canvas = $("canvas")[1];
var anim = anim_canvas.getContext("2d");
var quest_dlg;

var left_arrow = new Image();
var right_arrow = new Image();

var selected;
var ai_weight;

var ended; // 0 for playing, 1 for player 1, 2 for player 2, 3 for tie
var page_status; // 0 for game, 1 for dic, 2 for player, and etc.
var ai_mode = 0; // 0 for normal mode, non-zero for ai mode

var timeout_token;
var drawarrow_token;

var last_hand;
var need_sleep;

var dict_list;
var dict_index = 0;

////////////////////
// Game Functions //
////////////////////
function Init() {
	/* Initialize grid status */
	selected = Alloc2dArray(row, col);
	ai_weight = Alloc2dArray(row, col);

	/* Set-up canvas */
	game_canvas.width = col * size + 10;
	game_canvas.height = row * size + 10 + title_height;
	game_canvas.style.position = "absolute";
	game_canvas.style.left = ((window.innerWidth - game_canvas.width) / 2 > 6) ? (window.innerWidth - game_canvas.width) / 2 : 6;
	game_canvas.style.zIndex = 0;

	anim_canvas.width = game_canvas.width;
	anim_canvas.height = game_canvas.height;
	anim_canvas.style.position = game_canvas.style.position;
	anim_canvas.style.left = game_canvas.style.left;
	anim_canvas.style.zIndex = 1;

	game.translate(10 / 2, 10 / 2);
	anim.translate(10 / 2, 10 / 2);
	game.textBaseline = "hanging";

	/* Load arrow images */
	left_arrow.src = "res/left_arrow.png";
	right_arrow.src = "res/right_arrow.png";

	/* Draw something */
	color = player1_color;
	DrawPlayerName();
	DrawBoard(col, row);
	DrawArrow();

	/* Display timeout */
	clearTimeout(timeout_token);
	PlayerTimeout(timeout);

	/* Others */
	page_status = 0;
	steps_counter = 0;
	ended = 0;
	need_sleep = true;
	right_answer = false;
	ai_mode = 1;
	$("#cur-mode").html((!ai_mode) ? "目前模式：普通" : "目前模式：AI");
}

function DrawCircle(x, y, color) {
	game.save();
	game.translate(0, title_height); // Reserved height for title
	game.beginPath();
	game.strokeStyle = "rgba(" + parseInt(color.substring(1, 3), 16) + ", " +
						 parseInt(color.substring(3, 5), 16) + ", " + parseInt(color.substring(5, 7), 16) + ", 0.4)";
	game.fillStyle = game.strokeStyle;
	game.arc((x - 1) * size + size / 2, (y - 1) * size + size / 2, radius, 0, 2 * Math.PI, false);
	game.fill();
	game.closePath();
	game.stroke();
	game.restore();

	if (typeof(last_hand) == "object")
		anim.clearRect((last_hand[0] - 1) * size, title_height + (last_hand[1] - 1) * size, size, size);
	last_hand = [x, y];

	anim.save();
	anim.translate(0, title_height); // Reserved height for title
	anim.beginPath();
	anim.lineWidth = line_width + 1;
	anim.strokeStyle = color;
	anim.arc((x - 1) * size + size / 2, (y - 1) * size + size / 2, radius, 0, 2 * Math.PI, false);
	anim.closePath();
	anim.stroke();
	anim.restore();
}

function DrawLine(x1, y1, x2, y2, color) {
	game.save();
	game.beginPath();
	game.moveTo(x1, y1);
	game.lineTo(x2, y2);
	game.lineWidth = line_width;
	game.strokeStyle = color;
	game.closePath();
	game.stroke();
	game.restore();
}

function DrawBoard(width, height) {
	game.save();
	game.translate(0, title_height); // Reserved height for title
	game.font = "16pt CustomFont";

	for (var x = 0; x <= width; x++)
		DrawLine(x * size, 0, x * size, height * size, "black");
	for (var y = 0; y <= height; y++)
		DrawLine(0, y * size, width * size, y * size, "black");

	game.restore();
}

function DrawPlayerName() {
	var player2_name = (ai_mode) ? "Computer" : player2;

	game.save();
	game.font = "18pt CustomFont";

	game.fillStyle = player1_color;
	game.fillText(player1, 0, Math.ceil((title_height - MeasureText(player1, false, "CustomFont", 18)[1]) / 2));

	game.fillStyle = player2_color;
	game.fillText(player2_name, col * size - MeasureText(player2_name, false, "CustomFont", 18)[0],
					Math.ceil((title_height - MeasureText(player2_name, false, "CustomFont", 18)[1]) / 2));

	game.restore();
}

function DrawArrow() {
	var player2_name = (ai_mode) ? "Computer" : player2;

	game.save();

	var player1_text_info = MeasureText(player1, false, "CustomFont", 18);
	var player2_text_info = MeasureText(player2_name, false, "CustomFont", 18);

	game.clearRect(col * size - player2_text_info[0] - right_arrow.width - 10 - 10,
						Math.ceil((title_height - player2_text_info[1]) / 2), right_arrow.width + 10, right_arrow.height);
	game.clearRect(player1_text_info[0] + 10, Math.ceil((title_height - player1_text_info[1]) / 2),
				left_arrow.width + 10, left_arrow.height);

	if (color == player1_color) {
		game.drawImage(left_arrow, player1_text_info[0] + 10 + 1 * 10, Math.ceil((title_height - player1_text_info[1]) / 2));
	} else {
		game.drawImage(right_arrow, col * size - player2_text_info[0] - right_arrow.width - 10 - 1 * 10,
						Math.ceil((title_height - player2_text_info[1]) / 2));
	}

	game.restore();
}

function ShowMessage(title, message) {
	var type = BootstrapDialog.TYPE_DEFAULT;
	var cssClass = "btn-warning";

	if (title == "警告") {
		type = BootstrapDialog.TYPE_WARNING;
		cssClass = "btn-warning";
	} else if (title == "錯誤") {
		type = BootstrapDialog.TYPE_DANGER;
		cssClass = "btn-danger";
	} else if (title == "提示") {
		type = BootstrapDialog.TYPE_INFO;
		cssClass = "btn-info";
	}

	BootstrapDialog.show({
		title: title,
		message: message,
		type: type,
		buttons: [{
			label: "確定",
			cssClass: cssClass,
			action: function(dialogRef){
					dialogRef.close();
								}
			}]
		});
}

function CheckWinner(x, y) {
	var count;
	var i, j;

	game.save();

	game.translate(0, line_width * 2); // Reserved height for line

	count = 1; // Vertical
	for (i = 1; CheckXY(x, y + i) && selected[y + i][x] == selected[y][x]; i++)
		count++;
	for (j = -1; CheckXY(x, y + j) && selected[y + j][x] == selected[y][x]; j--)
		count++;
	if (count >= 5) {
		ended = (color == player1_color) ? 1 : 2;
		DrawLine(x * size - size / 2, (y + j + 1) * size, x * size - size / 2, (y + i) * size, color);
	}

	count = 1; // Horizontal
	for (i = 1; CheckXY(x + i, y) && selected[y][x + i] == selected[y][x]; i++)
		count++;
	for (j = -1; CheckXY(x + j, y) && selected[y][x + j] == selected[y][x]; j--)
		count++;
	if (count >= 5) {
		ended = (color == player1_color) ? 1 : 2;
		DrawLine((x + j) * size, y * size + size / 2, (x + i - 1) * size, y * size + size / 2, color);
	}

	count = 1; // BackSlash
	for (i = 1; CheckXY(x + i, y + i) && selected[y + i][x + i] == selected[y][x]; i++)
		count++;
	for (j = -1; CheckXY(x + j, y + j) && selected[y + j][x + j] == selected[y][x]; j--)
		count++;
	if (count >= 5) {
		ended = (color == player1_color) ? 1 : 2;
		DrawLine((x + j) * size, (y + j + 1) * size, (x + i - 1) * size, (y + i) * size, color);
	}

	count = 1; // Slash
	for (i = 1; CheckXY(x - i, y + i) && selected[y + i][x - i] == selected[y][x]; i++)
		count++;
	for (j = -1; CheckXY(x - j, y + j) && selected[y + j][x - j] == selected[y][x]; j--)
		count++;
	if (count >= 5) {
		ended = (color == player1_color) ? 1 : 2;
		DrawLine((x + Math.abs(j) - 1) * size, (y + j + 1) * size, (x - i) * size, (y + i) * size, color);
	}

	game.restore();

	if (!ended) {
		var selected_count = 0;

		for (var y = 1; y <= row; y++) {
			for (var x = 1; x <= col; x++)
				selected_count += (selected[y][x] != 0);
		}

		ended = (selected_count == col * row) ? 3 : 0;
	}

	if (ended) {
		clearTimeout(timeout_token);
		$("#timeout").html("遊戲結束");
		EndGame();
	} else {
		color = (color == player1_color) ? player2_color : player1_color;

		DrawArrow();
		clearTimeout(timeout_token);
		PlayerTimeout(timeout);
	}
}

function Restart(time) {
	if (typeof(time) == "undefined")
		time = 5;

	clearTimeout(timeout_token);
	Init();

	if (time != 0) {
		setTimeout("Restart(" + (time - 1) + ")", 50);
	}
}

function PlayerTimeout(time) {
	var miniutes = parseInt(time / 60);
	var seconds = parseInt(time % 60);

	if (miniutes.toString().length == 1)
		miniutes = "0" + miniutes;
	if (seconds.toString().length == 1)
		seconds = "0" + seconds;

	$("#timeout").html(miniutes + ":" + seconds);
	if (time == 0) {
		color = (color == player1_color) ? player2_color : player1_color;

		DrawArrow();
		if (!ended)
			PlayerTimeout(timeout);
		if (ai_mode)
			ComputerAI(0, 0);
	} else {
		timeout_token = setTimeout("PlayerTimeout(" + (time - 1) + ")", 1000);
	}
}

function EndGame(font_size) {
	var player2_name = (ai_mode) ? "Computer" : player2;
	var string;
	if (ended != 3)
		string = ((ended == 1) ? player1 : player2_name) + " Wins!";
	else
		string = "Tie!";

	BootstrapDialog.show({
		title: "遊戲結束",
		message: "<span style=\"font-size: 50pt;\">" + string + "</span>",
		buttons: [{
			label: "重新遊戲",
			cssClass: "btn-primary",
			action: function(dialogRef){
				Restart();
				dialogRef.close();
			}
		}, {
			label: "確定",
			cssClass: "btn-primary",
			action: function(dialogRef){
				dialogRef.close();
			}
		}]
	});
}

function ProcessAnswer(x, y) {
	if ($("*[name='choice']")[answer_pos].checked)
		right_answer = true;

	if (right_answer) {
		right_answer = false;
		steps_counter = 0;

		selected[y][x] = (color == player1_color) ? 1 : 2;

		DrawCircle(x, y, color);
		CheckWinner(x, y);

		UpdatePlayerScore();

		if (ai_mode && color == player2_color)
			ComputerAI(x, y);
	}
}

//////////////////////
// Shared Functions //
//////////////////////
function Alloc2dArray(row, col) {
	var result = [];
	for (var i = 0; i <= row; i++) {
		var columns = [];
		for (var j = 0; j <= col; j++)
			columns[j] = 0;
		result[i] = columns;
	}

	return result;
}

function LeftTopPos(obj) {
	var result = [];

	result[0] = result[1] = 0;
	if(obj.offsetParent){
		while(obj.offsetParent){
			result[0] += obj.offsetLeft;
			result[1] += obj.offsetTop;
			obj = obj.offsetParent;
		}
	}

	return result;
}

function CheckXY(x, y)
{
	return (x <= col && x >= 1 && y <= row && y >= 1);
}

function MeasureText(text, bold, font, size)
{
	var key = text + ":" + bold + ":" + font + ":" + size;
	if (typeof(measure_text_cache) == "object" && measure_text_cache[key])
		return measure_text_cache[key];

	var div = document.createElement("div");
	div.innerHTML = text;
	div.style.position = "absolute";
	div.style.top = "-100px";
	div.style.left = "-100px";
	div.style.fontFamily = font;
	div.style.fontWeight = (bold) ? "bold" : "normal";
	div.style.fontSize = size + "pt";
	document.body.appendChild(div);

	var size = [div.offsetWidth, div.offsetHeight];

	document.body.removeChild(div);

	if (typeof(measure_text_cache) != "object")
		measure_text_cache = [];
	measure_text_cache[key] = size;

	return size;
}

///////////////////////
// AI Mode Functions //
///////////////////////
function MatchChessType(x, y, dir, type, is_computer) {
	var str = "";
	var len = type.length;

	selected[y][x] = 1;
	if (is_computer) {
		selected[y][x] = 2;
		type = type.replace(/1/g, "x").replace(/2/g, "1").replace(/x/g, "2");
	}

	if (dir == "-")	{
		for (var i = -(len - 1); i < len; i++) {
			if (CheckXY(x, y))
				str += parseInt(selected[y][x + i]).toString();
		}
	} else if (dir == "|") {
		for (var i = -(len - 1); i < len; i++) {
			if (CheckXY(x, y + i))
				str += parseInt(selected[y + i][x]).toString();
		}
	} else if (dir == "/") {
		for (var i = -(len - 1); i < len; i++) {
			if (CheckXY(x + i, y + i))
				str += parseInt(selected[y + i][x + i]).toString();
		}
	} else {
		for (var i = -(len - 1); i < len; i++) {
			if (CheckXY(x - i, y + i))
				str += parseInt(selected[y + i][x - i]).toString();
		}
	}

	selected[y][x] = 0;

	return str.indexOf(type);
}

function FindAllDir(x, y, type, weight)
{
	if (MatchChessType(x, y, "-", type, false) != -1)
		ai_weight[y][x] += weight / 2;

	if (MatchChessType(x, y, "|", type, false) != -1)
		ai_weight[y][x] += weight / 2;

	if (MatchChessType(x, y, "/", type, false) != -1)
		ai_weight[y][x] += weight / 2;

	if (MatchChessType(x, y, "\\", type, false) != -1)
		ai_weight[y][x] += weight / 2;

	if (MatchChessType(x, y, "-", type, true) != -1)
		ai_weight[y][x] += weight;

	if (MatchChessType(x, y, "|", type, true) != -1)
		ai_weight[y][x] += weight;

	if (MatchChessType(x, y, "/", type, true) != -1)
		ai_weight[y][x] += weight;

	if (MatchChessType(x, y, "\\", type, true) != -1)
		ai_weight[y][x] += weight;
}

function FindFive(x, y) {
	/* Status  Weight
		 11111   100000
	*/
	var type = "11111";
	var weight = 100000;

	FindAllDir(x, y, type, weight);
}
function FindFour(x, y) {
	/* Status  Weight
		 011110  40000
		 211110  10000
		 011112
		 10111
		 11101
		 11011
	*/
	var type = ["011110", "211110", "011112", "10111", "11101", "11011"];
	var weight = [40000, 10000, 10000, 10000, 10000, 10000];

	for (var i = 0; i < type.length; i++)
		FindAllDir(x, y, type[i], weight[i]);
}
function FindThree(x, y) {
	/* Status  Weight
		 01110   10000
		 010110
		 011010
		 21110   2000
		 01112
		 210110
		 010112
	*/
	var type = ["01110", "010110", "011010", "21110", "01112", "210110", "010112"];
	var weight = [10000, 10000, 10000, 2000, 2000, 2000, 2000];

	for (var i = 0; i < type.length; i++)
		FindAllDir(x, y, type[i], weight[i]);
}

function FindTwo(x, y) {
	/* Status  Weight
		 01100   600
		 00110
		 01010
		 010010
		 211000  200
		 000112
		 201100
		 001102
		 200110
		 011002
		 210100
		 001012
		 201010
		 010102
		 210010
		 010012
	*/

	var type = ["01100", "00110", "01010", "010010", "211000", "000112", "201100", "001102",
				"200110", "011002", "210100", "001012", "201010", "010102","210010","010012"];
	var weight = [600, 600, 600, 600, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200];

	for (var i = 0; i < type.length; i++)
		FindAllDir(x, y, type[i], weight[i]);
}

function FindWeight() {
	for (var y = 1; y <= row; y++) {
		for (var x = 1; x <= col; x++) {
			if (selected[y][x])
				continue;

			FindTwo(x, y);
			FindThree(x, y);
			FindFour(x, y);
			FindFive(x, y);
		}
	}
}

function InitWeight() {
	var n = Math.min(row, col);
	var proceed = Alloc2dArray(row, col);
	var que = new Array();
	var dir = [[-1, -1], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, -1], [1, 1]];
	var x, y;

	if (n % 2 == 0) {
		x = Math.ceil(n / 2) + Math.round(Math.random());
		y = Math.ceil(n / 2) + Math.round(Math.random());
	} else {
		x = y = Math.ceil(n / 2);
	}
	n = Math.ceil(n / 2);

	que.push([x, y, n]);
	proceed[y][x] = 1;
	while(que.length) {
		var cur = que.shift();
		var x = cur[0], y = cur[1];

		ai_weight[y][x] = (!selected[y][x]) ? cur[2] : (-1);

		for (var i = 0; i < dir.length; i++) {
			if (CheckXY (x + dir[i][0], y + dir[i][1]) && !proceed[y + dir[i][1]][x + dir[i][0]]) {
				que.push([x + dir[i][0], y + dir[i][1], (cur[2] == 0) ? 0 : (cur[2] - 1)]);
				proceed[y + dir[i][1]][x + dir[i][0]] = 1;
			}
		}
	}
}

function LastHandWeight(x, y)
{
	if (x == 0 && y == 0)
		return;

	var n = Math.ceil(Math.min(row, col) / 2);
	var proceed = Alloc2dArray(row, col);
	var que = new Array();
	var dir = [[-1, -1], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, -1], [1, 1]];

	que.push([x, y, n]);
	proceed[y][x] = 1;
	while(que.length) {
		var cur = que.shift();
		var x = cur[0], y = cur[1];

		if (!selected[y][x])
			ai_weight[y][x] += cur[2];

		for (var i = 0; i < dir.length; i++) {
			if (CheckXY (x + dir[i][0], y + dir[i][1]) && !proceed[y + dir[i][1]][x + dir[i][0]]) {
				que.push([x + dir[i][0], y + dir[i][1], (cur[2] == 0) ? 0 : (cur[2] - 1)]);
				proceed[y + dir[i][1]][x + dir[i][0]] = 1;
			}
		}
	}
}

function ComputerAI(x, y)
{
	right_answer = false;

	InitWeight();
	LastHandWeight(x, y);
	FindWeight();

	x = y = -1;
	for (var i = 1; i <= row; i++) {
		for (var j = 1; j <= col; j++) {
			if (x == -1 || y == -1 || ai_weight[y][x] < ai_weight[i][j]) {
				x = j;
				y = i;
			}
		}
	}

	if (need_sleep && ai_weight[y][x] <= 20000) {
		need_sleep = false;
		setTimeout("ComputerAI(" + x + ", " + y + ")", Math.random() * 3000 + 500);
		return;
	}

	need_sleep = true;
	steps_counter = steps_counter + 1;
	selected[y][x] = (color == player1_color) ? 1 : 2;
	DrawCircle(x, y, color);
	CheckWinner(x, y);
}


/////////////////////
// Event Functions //
/////////////////////
anim_canvas.onclick = function(event) {
	if (ended || (ai_mode && color == player2_color))
		return;

	var left_top_pos = LeftTopPos(game_canvas);
	var x = Math.ceil((event.pageX - left_top_pos[0] - 10 / 2) / size);
	var y = Math.ceil((event.pageY - left_top_pos[1] - title_height - 10 / 2) / size);

	if (!CheckXY(x, y) || selected[y][x])
		return;

	selected[y][x] = (color == player1_color) ? 1 : 2;

	DrawCircle(x, y, color);
	CheckWinner(x, y);

	if (ai_mode && color == player2_color)
		ComputerAI(x, y);
}

window.onresize = function() {
	game_canvas.style.left = ((window.innerWidth - game_canvas.width) / 2 > 6) ? (window.innerWidth - game_canvas.width) / 2 : 6;
	anim_canvas.style.left = game_canvas.style.left;
}

left_arrow.onload = DrawArrow;

$("#menu-toggle").click(function(e) {
	e.preventDefault();
	$("#wrapper").toggleClass("toggled");
});

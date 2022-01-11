
$(function(){
	$('#thumbnail_list').hide();
	$('#details').hide();
	$('.readMoreBtn').hide();
	let maxThumCnt = 0;     // 最大表示件数
	let currentThumCnt = 0; // 現在の表示件数
	const defaultThumCnt = 10; // 初期表示件数
	const addThumCnt = 10;     // 追加表示件数
	let thumbnailNum = $('#thumbnail_list').children('li');
	$('#headerInfo h2').text('気になるボタンを選んでみよう');
	//ブラウザ戻る、進むイベント(popstate)
	window.addEventListener("popstate", function(e){
		$('#tagButtonList button').prop('disabled',false);
		//stateで判断
		if(e.state == null){
			$('#headerInfo h2').text('気になるボタンを選んでみよう');
			$('#details').hide();
			$('#contents').hide();
			$('#tagButtonList').fadeIn();
		}else if(e.state == '#thumbnail'){
			$('#headerInfo h2').text('詳しく知りたいアートを選ぼう');
			$('#tagButtonList').hide();
			$('#contents').fadeIn();
			$('#contents ul').fadeIn();
			$('#details').hide();
		}else if(e.state == '#details'){
			$('#contents').hide();
		$('#details').fadeIn();
		}
	});

	//作品詳細から一気にTOP戻る
	$(document).on('click','#top_back_button', function () {
		location.href = '/art-search/';
	});

	//ひとつ前に戻るボタンが押されたとき
	$(document).on('click','#back_button', function () {
		$('#tagButtonList button').prop('disabled',false);
		if(history.state == '#thumbnail'){
			history.pushState(null,null,"");
			$('#details').hide();
			$('#contents').hide();
			$('#tagButtonList').fadeIn();
		}else if(history.state == '#details'){
			history.pushState('#thumbnail',null,"");
			$('#tagButtonList').hide();
			$('#contents').fadeIn();
			$('#contents ul').fadeIn();
			$('#details').hide();
		}
	});
		//タグボタンクリックイベント
	$(document).on('click','#tag_button', function () {

		let tagVal = $(this).val();
		$(this).prop('disabled',true);
		//サムネイル一覧画面の履歴保存
		history.pushState('#thumbnail',null,"");

		$('#headerInfo h2').text('詳しく知りたいアートを選ぼう');

		ObjIdAjax(tagVal).then(function(data) {		//IDsを取得
			$('#contents ul').empty();
			$('#tagButtonList').fadeOut();
			$('#contents').fadeIn();
			$('#contents ul').fadeIn();

			//初期サムネイル表示
			thumDisplay(data['objectIDs']);
			$('#navBer button').prop('disabled', false);

			//もっと見るクリックイベント
			$('.readMoreBtn').click(function () {
				currentThumCnt += addThumCnt;//10づつ増えていく
				thumDisplay(data['objectIDs']);
			});
		});
	});

	//作品のIDを取得して詳細を表示
	$(document).on("click", "#thumbnailArt", function () {

		//レスポンシブル用のHTML生成
		let windowWid = $(window).width();
		  if(windowWid<=479){
			 $('.artist-detail li,.artWork-detail li').unwrap();
			 $('.details-document li').wrapAll('<ul class="responsive-details">');
		 }
		 $('#headerInfo h2').text('');
		//作品詳細画面の履歴保存
		history.pushState('#details',null,"");

		//一回imageを空にして再描写
		$('#details #primaryImage img').attr('src','');
		$('#contents').hide();
		$('#details').show();

		let artIdVal = $(this).val();
		objDetailAjax(artIdVal).then(function(data){//詳細リクエストajax
			let transTags;
			let transTitle;
			let transArtistNationality;
			let transMedium;
			let transArtistDisplayName;
			let transArtistDisplayBio;
			//タグの配列を文字列にする。
			let tags = data['tags'].join(',');
			//$('#text').text(tags);
			let artistDisplayBio = JSON.stringify(data.artistDisplayBio);

			//処理をするajaxを配列にして並列処理で詳細データを翻訳
			var transAjaxArray = [googleApiAjax(data.artistDisplayName),googleApiAjax(data.artistNationality)
				,googleApiAjax(data.title),googleApiAjax(data.medium),googleApiAjax(tags),googleApiAjax(artistDisplayBio)];

			$.when.apply($, transAjaxArray).then(function() {
				transArtistDisplayName = arguments[0][0]['data']['translations'][0]['translatedText'];
				transArtistNationality = arguments[1][0]['data']['translations'][0]['translatedText'];
				transTitle  = arguments[2][0]['data']['translations'][0]['translatedText'];
				transMedium  = arguments[3][0]['data']['translations'][0]['translatedText'];
				transTags  = arguments[4][0]['data']['translations'][0]['translatedText'];
				transArtistDisplayBio = arguments[5][0]['data']['translations'][0]['translatedText'];
			}
			 ,function() {
				transArtistDisplayName = data.artistDisplayName;
				transArtistNationality =data.artistNationality;
				transTitle  = data.title;
				transMedium  = data.Medium;
				transTags  = tags;
				transArtistDisplayBio = data.artistDisplayBio;
			 })
			.always(function() {
				$('#details #primaryImage img').attr('src',data['primaryImage']);
				//作者詳細データ
				$('#details .artistDisplayName').html('作者：'+ transArtistDisplayName );
				$('#details .artistCountry').html('国籍：'+ transArtistNationality);
				$('#details .artistDisplayBio').html('生まれ、生誕～死去、死没地：'+ transArtistDisplayBio);
				//作品詳細データ
				$('#details .title').html('タイトル：' + '「'+transTitle+'」');
				$('#details .objectDate').html('作成日：' + data.objectDate);
				$('#details .medium').html('素材：' +transMedium);
				$('#details .dimensions').html('大きさ：' + data.dimensions);
				$('#details .tags').html('タグ：' + transTags);
			});
		});
	});

	//サムネイル表示関数
	function  thumDisplay(objectDataIDs){
		let thumbnailList = objectDataIDs;
		let transTitleThum;

		//(今表示されている画像の次<10件）の範囲のサムネイル配列をretrunしている
		let filteredObjIDs = thumbnailList.filter(function(element, index, array) {
			let newCount =currentThumCnt + addThumCnt; // 新しくサムネイルを表示する件数
			if(currentThumCnt == 0){
				return (index <  defaultThumCnt);
			}
				return (currentThumCnt <= index  && index < newCount);
		});

		$(filteredObjIDs).each(function (j, objIdData) {
			ThumListAjax(objIdData).done(function(objDataJson){
				googleApiAjax(objDataJson.title).then(function(transTitle){
					transTitleThum = transTitle['data']['translations'][0]['translatedText'];
				},function(){
					transTitleThum = objDataJson['title'];
				}).always(function(){
					$('#thumbnail_list').append('<li id="thumbnailArt" class="thumbnail-art" value="' + objDataJson['objectID']
					+ '"data-count="'+j+'"><img src="'+ objDataJson['primaryImageSmall'] + '"id="thumbnail_images" class="thumbnail-images" alt="画像"><p>'
					+'「'+transTitleThum +'」'+'</p></li>');
				});
				maxThumCnt++;

				//もっと見るボタン表示
				if(objectDataIDs.length != maxThumCnt){
					$('.readMoreBtn').show();
				}else{
					$('.readMoreBtn').hide();
				}
			});
		});
	}

	//①ID取得ajax
	function ObjIdAjax(tagVal){
		return $.ajax({
		    url: 'https://collectionapi.metmuseum.org/public/collection/v1/search',
		    type:'GET',
		    dataType: 'json',
		    timeout:20000,
		    data:{
		    	'hasImages':true,
		    	'q': tagVal
		    }
		})
	};
	//②サムネイルを取得ajax
	function ThumListAjax(objectIDs){
		return $.ajax({
		  url: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/'+ objectIDs,
		  type:'GET',
		  dataType: 'json',
		  timeout:20000
		})
	};
	//③ 詳細情報取得ajax
	function objDetailAjax (artIdVal){
		return $.ajax({
		    url: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/'+ artIdVal,
		    type:'GET',
		    dataType: 'json',
		    timeout:10000
		});
	};
	//④googoleAPIを呼び出すajax
	function googleApiAjax(translationData) {
		return $.ajax({
			url: 'https://translation.googleapis.com/language/translate/v2/',
			type:'POST',
			dataType: 'json',
			data:{
				'q':translationData,
				'target': 'ja',
				"format": "text",
				'key': 'AIzaSyBAWzaDZcce7O8UURlYjmNIy4mGt6KtPWc'
			}
		});
	};
});


// canvas
 
var drawing = false;
// 前回の座標を記録する（初期値：０）
var before_x = 0;
var before_y = 0;
 
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
 
canvas.addEventListener('mousemove', draw_canvas);
// マウスをクリックしてる時
canvas.addEventListener('mousedown', function(e) {
drawing = true;
var rect = e.target.getBoundingClientRect();
before_x = e.clientX - rect.left;
before_y = e.clientY - rect.top;
});
// マウスをクリックしてない時
canvas.addEventListener('mouseup', function() {
drawing = false;
});
 
// 描画の処理
function draw_canvas(e) {
// drawingがtrueじゃなかったら返す
if (!drawing){
return
};
var rect = e.target.getBoundingClientRect();
var x = e.clientX - rect.left;
var y = e.clientY - rect.top;
var w = document.getElementById('width').value;
var color = document.getElementById('color').value;
var r = parseInt(color.substring(1,3), 16);
var g = parseInt(color.substring(3,5), 16);
var b = parseInt(color.substring(5,7), 16);
// 描画
ctx.lineCap = 'round';
ctx.strokeStyle = 'rgb('+ r + ',' + g + ',' + b + ')';
ctx.lineWidth = w;
ctx.beginPath();
ctx.moveTo(before_x, before_y);
ctx.lineTo(x, y);
ctx.stroke();
ctx.closePath();
// 描画最後の座標を前回の座標に代入する
before_x = x;
before_y = y;
}
 
// クリアボタンクリック時
// クリアボタンクリックした時にアラートを表示
function delete_canvas(){
ret = confirm('canvasの内容を削除します。');
// アラートで「OK」を選んだ時
if (ret == true){
ctx.clearRect(0, 0, canvas.width, canvas.height);
}
}
 
var pen = document.getElementById('pencil');
var era = document.getElementById('eraser');
// 鉛筆と消しゴムの切り替え
 
function tool(btnNum){
// クリックされボタンが鉛筆だったら
if (btnNum == 1){
ctx.globalCompositeOperation = 'source-over';
pen.className = 'active';
era.className = '';
}
// クリックされボタンが消しゴムだったら
else if (btnNum == 2){
ctx.globalCompositeOperation = 'destination-out';
pen.className = '';
era.className = 'active';
}
}

// canvasを画像で保存
$("#download").click(function(){
	canvas = document.getElementById('canvas');
	var base64 = canvas.toDataURL("image/png");
	document.getElementById("download").href = base64;
	});


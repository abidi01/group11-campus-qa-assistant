$(function () {
	const rows = 4
	var index = 1;
    var imgSrc="",videoSrc="",ititle="";
	var allpage = null
	$(".faybox .close").on("click", function () {
		$(".faybox").removeClass("open")
		$(".faybox .artcontent").remove()
		$(".faybox .fay_tt").text('')
                $("video").each(function(){
                     $(this)[0].pause()
                })
	})

$(".loadingDiv ").hide()
$(".post-41 .con .news").each(function(){
    if($(this).attr("type")=="图片文章"){
       $(this).find('.play').hide()
       $(this).find('.news_con').addClass("fancyOpen")
    }
})

	/* $(".col_news_list .news_list.list2").waterfall({
		itemClass: ".col_news_list .news_list.list2 .news",
		minColCount: 1,
		spacingWidth: 0,
		spacingHeight: 0,
		resizeable: true,
		itemAlign: "left",
		ajaxCallback: function (success, end) {  
			if (allpage && index >= allpage) {
				$(".col_news_list .news_list.list2").removeClass("loading") 
                                $(".loadingDiv ").hide()
				$(".col_news_list .news_list.list2").addClass("end")
				return;
			}
			$(".col_news_list .news_list.list2").addClass("loading"); 
                         $(".loadingDiv ").show()
			index++
                         loadContents(index);
                       setTimeout(function(){
                           success();
			   $(".col_news_list .news_list.list2").removeClass("loading")
                           $(".loadingDiv ").hide()
			end();
                       },500)
                          $(".loadingDiv ").hide()

			
		}
	}); */
$(".col_news_list .read_more").click(function(){
	
			$(".col_news_list .news_list.list2").addClass("loading"); 
                         $(".loadingDiv ").show()
			index++
                         loadContents(index);
                       setTimeout(function(){
                           success();
			   $(".col_news_list .news_list.list2").removeClass("loading")
                           $(".loadingDiv ").hide()
			end();
                       },500)
                          $(".loadingDiv ").hide()
						  if (allpage && index >= allpage) {
				$(".col_news_list .news_list.list2").removeClass("loading") 
                                $(".loadingDiv ").hide()
				$(".col_news_list .news_list.list2").addClass("end")
				$(".col_news_list .read_more").hide()
			}
})
	 function loadContents(pageIndex) {
                $(".loadingDiv ").show()
                 $("body").addClass("waiting")
		//排序参数
		var orderData = [
		];
		var returnInfos = JSON.stringify([
			{ field: "title", pattern: [{ name: "lp", value: "30" }], name: "title" },
			{ field: "imgPath", name: "imgPath" },
			{ field: "source", name: "source" },{ field: "shortTitle", name: "shortTitle" },{field: "summary", name: "summary" },
			{ field: "publishDay", pattern: [{ name: "d", value: "MM-dd" }], name: "publishTime" },
			{ field: "publishYear", pattern: [{ name: "d", value: "yyyy" }], name: "publishTime" },
			{ field: "publishTime", pattern: [{ name: "d", value: "yyyy-MM-dd" }], name: "publishTime" }
		]);
		var orders = JSON.stringify(orderData);
		var conditions = JSON.stringify([
			{ field: "scope", value: 1, judge: "=" }
		]);
		$.ajax({
			url: "/_wp3services/generalQuery?queryObj=articles",
			type: 'POST',
			contentType: "application/x-www-form-urlencoded; charset=utf-8",
			async: false,
			dataType: 'json',
			data: {
				siteId: 3,
				columnId: 23317,
				pageIndex: pageIndex,
				rows: rows,
				orders: orders,
				returnInfos: returnInfos,
				conditions: conditions
			},
			success: function (result) {
$(".loadingDiv ").hide()
  $("body").removeClass("waiting")
				if (!allpage) {
					allpage = Math.ceil(result.total / rows)
				}

				if (result != null) {
					//console.log(result);
					for (j = 0; j < result.data.length; j++) {
						var art = result.data[j];

						html = '<li class="news n' + (j + 1) + ' clearfix" >' +
						'<a class="news_box" href="' + art.url + '" target="_blank">'+
                      '<div class="topbox"><div class="img_box"><div class="news_imgs"><img src="' + art.imgPath + '" alt="" class="lazy"></div>'+
                        '</div><div class="ttbox"><div class="news_title">' + art.title + '</div><div class="sub_tt">' + art.shortTitle + '</div></div></div>'+
                     '<div class="news_text">' + art.summary + '</div>'+
 '<div class="news_gd">查看详情<img src="/_upload/tpl/05/df/1503/template1503/images/more_b.svg"></div>'+
                    '</a></li>'
						$(".col_news_list .news_list.list2").append(html)
					}
					//$(" .col_news_list .news_list.list2 .news .news_con a:not(.news_more_a)").off("click")
					$(" .fancyOpen").off("click").on("click", function () { 
						loadContentsImg($(this).find(".news_title").text())
						$(".fay_control .more").attr("href", $(this).find(".news_more a").attr("href"))
						$(".faybox").addClass("open")
					})
				}
			}
		});
	}


	
})
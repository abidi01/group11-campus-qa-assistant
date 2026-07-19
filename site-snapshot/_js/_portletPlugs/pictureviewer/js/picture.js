var win = window;
function pictureViewer(context){

    /*
        本插件  通过在父元素的定义  data-PictureSwitch 属性进行调用

        数据传输：
                    1：data-data
                        格式 ：  data-data='{"img": [{"src": "img/1.large.jpg","width":1920,"height": 1200},{"src": "img/2.large.jpg","width": 960,"height": 854},{"src": "img/23.jpg","width": 800,"height": 800},{"src": "img/17.large.jpg","width": 400,"height": 1920}]}'
                    2: data-src (该方式是通过 AJAX 进行获取数据 )
                        格式 ：  data-src='{"url":"data.json","type":"get","data":{"id":1},"dataType":"jsonp" }'
                        参数 :   url 接口连接
                                type 请求方式  默认为  ‘get’
                                data 请求的参数
                                dataType 是否跨域  默认为 ‘json’


    */
    var arr;
    var mainTemplate =  '<div class="section"><div class="p-head border-1px">' +
                            '<div class=" barset">'+
                                '<img class="p-screen" id="fullscreen" src="'+context+'/_js/_portletPlugs/pictureviewer/img/x_big.png" title="全屏" />'+
                                '<a class="p-prev iconfont icon-Left"></a>'+
                                '<span class="p-active">1</span>'+
                                '<span>/</span>'+
                                '<span class="p-pages">12</span>'+
                                '<a class="p-next iconfont icon-right"></a>'+
                                '<select class="p-go"></select>'+
                            '</div>'+
                        '</div>'+
                        '<div class="p-cont">'+
                            '<div id="wrap"  class="p-wrap">'+
                            '</div>'+
                        '</div></div>';

    var layerTemplate = '<div id="canvas">'+
                        '<div class="m-cont">'+
                        '<div class="m-head">'+
                        '<a class="m-go-back">'+
                        '返回'+
                        '</a>'+
                        '<a class="m-look-pic">'+
                        '原图'+
                        '</a>'+
                        '</div>'+
                        '<div class="m-box">'+
                        '<ul class="img-see">'+
                        '<li><div class="swiper-lazy-preloader"></div></li>'+
                        '</ul>'+
                        '</div>'+
                        '<div class="m-info">'+
                        '<div class="m-info-index">'+
                        '<span>1</span> / <span></span>'+
                        '</div>'+
                        '<p class="m-info-title"></p>'+
                        '</div>'+
                        '</div>'+
                        '</div>';

    var layerAlert = '<div class="p-alert">没有图片了！</div>'

    var isPc = function() {
        var userAgentInfo = navigator.userAgent;
        var Agents = ["Android", "iPhone",
            "SymbianOS", "Windows Phone",
            "iPad", "iPod"
        ];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    };


    var PictureSwitch = (function () {
        function PictureSwitch(element, options) {
            this.settings = $.extend(true, $.fn.PictureSwitch.default, options || []);
            this.element = element;
            this._dataOrAjax();
        }
        PictureSwitch.prototype = {
            // 判断到底使用ajax请求还是在父元素上定义 data-data属性
            _dataOrAjax: function () {
                if ( !this.element.data('data') ) {
                    this.getAjax();
                } else {
                    this.init();
                }

            },
            init: function () {
                var self  = this;
                this.data = this.settings.data.img;
                this.length = this.data.length;
                this.body = $('body');
                this.cid;
                this.w = this.element.width();
                this.h = this.element.height();
                this.winWidth = $(win).width();
                this.winHeight = $(win).height();
                this.winRatio = Number((this.winWidth / this.winHeight).toFixed(2));
                this.picRatio = 3/6 ;
                // 初始化 DOM 对象
                this.loadMain()
                    ._initDom();
                this.setWrapHeight(this.picRatio);
                this.loadPicture(this.element.width());
                self._getIndex();
                self._scrollEvent()
                    ._go()
                    ._prev()
                    ._next()
                    .getPolHeight();
                self.fullScreenBindEvent();

            },
            getAjax: function () {
                var self = this;
                var data = this.element.data('src');
                $.ajax({
                    url:data.url,
                    type:data.type || 'get',
                    data: data.data || '',
                    dataType:data.dataType || 'json',
                    success: function (data) {
                        self.settings.data = data;
                        self.init();
                    }
                });
            },
            // 加载框架
            loadMain: function () {
                if ( !$("#canvas")[0] ) {
                    this.body.append(layerTemplate);
                }
                this.element.html(mainTemplate);
                return this;
            },
            _initDom: function () {
                this.section = $('.section');
                this.head = $(".p-head");
                // 视口对象
                this.cont = $('.p-cont');
                // 容器对象
                this.wrap = $('.p-wrap');
                this.prev = $('.p-prev');
                this.next = $('.p-next');
                this.active = $('.p-active');
                this.pages = $('.p-pages');
                this.go = $('.p-go');
                this.mInfo = $('.m-info-index');

                this.pages.html(this.length);
                this.cont.width();

                this.head.width(this.element.width());
                this.mInfo.find('span:eq(1)').html(this.length);
                return this;
            },
            // 获得 视口 的高度
            setWrapHeight: function (ratio) {

                var contWidth,
                    contHeight;

                if (this.cont) {
                    contWidth = this.cont.width();
                    contHeight = parseInt(contWidth / ratio);
                    this.cont.height(contHeight);
                    this.cont.width(contWidth);
                }
                this.radio = contWidth / contHeight;
                return contHeight + 'px';
            },

            // 加载图片
            loadPicture: function (allWidth) {
                var self = this;
                var imgTemplate = '',
                    liHtml = '';
                $.each(this.data, function (index, value) {
                    if ( value.width / value.height > self.picRatio ) {
                        imgTemplate +=  '<div data-id="'+ index +'" class="p-list" style="height:'+ self.getImgHeight(allWidth, value.width, value.height) +'px"  data-url="'+value.src+'">'+
                            '</div>';
                    } else {
                        imgTemplate +=  '<div data-id="'+ index +'" class="p-list" style="height:'+ self.getImgHeight(allWidth, value.width, value.height) +'px"  data-url="'+value.src+'">'+
                            '</div>';
                    }
                });
                self.wrap.html(imgTemplate);
                this.list = $('.p-list');
                return self;
            },
            // 根据不同图片的大小 设置图片外层容器的高度
            getImgHeight: function (el,width,height) {
                height = parseInt( el / (828 / 1170) )
                return height;
            },
            // 这个是判断最后一张图片的高度是否大于视口的高度，如果不大于，则添加辅助元素
            getPolHeight: function () {
                var contHeight = this.cont.height();
                var lastListHeight = this.list.last().height();
                if ( lastListHeight < contHeight ) {
                    if ( !$(".p-ol")[0] ) {
                        this.wrap.append('<div class="p-ol"></div>')
                        
                    }
                    $('.p-ol').height(( contHeight - lastListHeight ));
                }
            },
            // 获取元素相对于祖籍的位置
            getAnchorPosition: function (index) {

                return parseInt(this.list.eq(index).position().top,10);

            },
            //获取每个锚点位置信息的数组
            getAllAnchorPosition: function () {
                var self = this;
                var allPositionArr = [];
                // self.wrap[0].scrollTop = 0;
                for (var i = 0; i < self.list.length; i++) {
                    allPositionArr.push(self.cont[0].scrollTop + self.getAnchorPosition(i));
                }
                arr = allPositionArr;
                return allPositionArr;
            },
            // 监听滚轮事件
            _scrollEvent: function () {
                var self = this,
                    page;
                var posArr = self._getIndex();
                console.log(arr)
                self.wrap.on('scroll',function (e){
                    // 图片懒加载
                    $.each(arr,function (index,value){
                        if ( self.wrap[0].scrollTop >= arr[index] ) {
                            var imgObj = new Image();
                            imgObj.src = $(self.list).eq(index).data('url');
                            $(self.list).eq(index).css({
                                'background':'url('+context+'/_js/_portletPlugs/pictureviewer/img/loading.gif) no-repeat center center'
                            });
                            imgObj.onload = function (e) {
                                var w = this.width;
                                var h = this.height;
                                if ( w / h > self.picRatio ) {
                                    self.list.eq(index).html('<div class="swiper-page"><div  class="swiper-page">' + (index+1) +'</div><div class="swiper-bg"></div></div><img  width="100%" data-id="'+ index +'" class="image" src="'+$(self.list).eq(index).data('url')+'" />');
                                } else {
                                    self.list.eq(index).html('<div class="swiper-page"><div class="swiper-page">' + (index+1) +'</div><div class="swiper-bg"></div></div><img width="100%" data-id="'+ index +'" class="image" src="'+$(self.list).eq(index).data('url')+'" />');
                                }
                            }
                        }
                    })
                    var getIndex = function (positionVal) {
                        for (var i = posArr.length; i > 0; i--) {
                            if (positionVal >= posArr[i]) {
                                return i;
                            }
                        }
                    };
                    if ( posArr.length === self.length ) {
                        if ( getIndex(self.wrap.scrollTop()) === undefined ) {
                            page = 1;
                        } else {
                            page = getIndex(self.wrap.scrollTop())+1;
                        }
                    }

                    self.active.html(page);
                });

                self.wrap.trigger('scroll');
                self.lookPictureBindEvent();
                return self;
            },
            // 下一页按钮
            _next: function () {
                var self = this,
                    page;
                self.next.on('click', function () {
                    page = Number(self.active.html());
                    console.log(page,self.length );
                    if ( page === undefined ) {
                        page = self.length-1;
                    } else if ( page === self.length ) {
                        page = self.length-1;
                    }
                    self.scrollTo((self.posArr[(page)]+1));
                });
                return self;
            },
            // 上一页按钮
            _prev: function () {
                var self = this,
                    page;
                self.prev.on('click', function () {
                    page = Number(self.active.html());
                    if ( page === undefined ) {
                        page = 0
                    }
                    self.scrollTo((self.posArr[(page-2)]+1));
                });
                return self;
            },
            // 跳转
            _go: function () {
                var self = this,
                    num,
                    selectTemplate='';
                self.posArr = self._getIndex();
                for ( var i = 0; i < self.length; i++ ) {
                    selectTemplate += '<option value="'+ (i+1) +'">第'+(i+1)+'页</option>'
                }

                self.go.html(selectTemplate);

                self.go.on('change',function (){
                    num = self.go.val();
                   if ( num ) {
                       if ( num < 0 ) {
                           num = 0;
                       } else if ( num > self.length ) {
                           num = self.length;
                       }
                   }
                   self.scrollTo(self.posArr[(num-1)]+1);
                });
                return self;
            },
            // 滚轮滚动的距离
            scrollTo: function (positionVal) {
                var self = this;
                self.wrap[0].scrollTop = positionVal;
            },
            // 查看大图
            lookPictureBindEvent: function () {
                var self = this;
                self.canvas = $('#canvas');
                self.mPic  = document.querySelector('.img-see');

                self.list.on('click','.image',function () {
                    var _index = cid = $(this).data('id');
                    self.canvas.fadeIn();
                    self.body.css("overflow","hidden");
                    console.log(_index);
                    self.loadImage(_index)
                        ._openWinPic();
                });

                self.canvas.find('.m-go-back').on('click',function (){
                    self.canvas.fadeOut();
                    self.body.css("overflow","auto");
                })
            },
            // 加载大图图片
            loadImage: function (index,cb) {
                var self = this;
                var imgSrc = this.data[index].src;
                var ImageObj = new Image();
                ImageObj.src = imgSrc;

                $('.img-see').find('li:eq(0)').html('<div class="swiper-lazy-preloader"></div>');

                ImageObj.onload = function (){
                    var w = this.width;
                    var h = this.height;

                    $('.img-see').find('li:eq(0)').html('<img data-id="'+ index +'" class="big-pic"> ');

                    var bigPic = $(".big-pic");
                    if ( w / h > self.picRatio ) {
                        bigPic.attr('src',imgSrc).css({
                            'width':self.winWidth,
                            'height' : 'auto'
                        });
                    } else {
                        bigPic.attr('src',imgSrc).css({
                            'height':self.winHeight,
                            'width' : 'auto'
                        });
                    }

                    if ( isPc() ) {
                        self.pcBindEvent();
                    } else {
                        self.bindEvent();
                    }

                    cb && cb();
                };



                $('.m-info-index').find('span').eq(0).html((index+1));
                return this;
            },
            // 移动端绑定事件
            bindEvent:function () {
                var self = this;
                self.mBigPic = self.mPic.querySelector('.big-pic');
                var id;
                var startHandler = function (e) {
                    id = Number($(e.target).data('id'));
                    // 按下时间
                    self.startTime = new Date() * 1;
                    // 获取 x 坐标
                    self.startX = e.touches[0].pageX;
                    // 纠正偏移量
                    self.offsetX = 0;
                };

                var moveHandler = function (e) {
                    e.preventDefault();
                    self.offsetX = e.targetTouches[0].pageX - self.startX;
                };
                var endHandler = function (e) {
                    e.preventDefault();
                    var boundary = self.winWidth / 6;
                    var endTime = new Date() * 1;
                    if ( endTime - self.startTime > 300) {
                        if ( self.offsetX >= boundary ) {
                            // 上一页
                            self.goLeftIndex(id-1);
                        } else if ( self.offsetX < 0 && self.offsetX < -boundary ) {
                            // 下一页
                            self.goRightIndex((id+1));
                        }
                    } else {
                        if ( self.offsetX > 50 ) {
                            self.goLeftIndex((id-1));
                        } else if ( self.offsetX < -50 ) {
                            // alert(2);
                            self.goRightIndex((id+1));
                        }
                    }

                };

                self.mBigPic.addEventListener('touchstart',startHandler);
                self.mBigPic.addEventListener('touchmove',moveHandler);
                self.mBigPic.addEventListener('touchend',endHandler);



                return self;
            },
            // PC端 绑定事件
            pcBindEvent: function () {
                var self = this;
                self.mBigPic = self.mPic.querySelector('.big-pic');
                var moveMouse = function (e) {
                    e.preventDefault();
                };
                var id;
                $(self.mBigPic).on('mousedown',function (e) {
                    e.preventDefault();
                    id = Number($(e.target).data('id'));
                    self.pcStartTime = new Date() * 1;
                    self.pcStartX = e.pageX;
                    self.pcOffsetX = 0;
                    $(self.mBigPic).on('mousemove.scroll',moveMouse)
                                .on('mouseup.scroll',function (e){
                                    e.preventDefault();
                                    var endTime = new Date() * 1;
                                    var boundary = self.winWidth / 6;
                                    self.pcOffsetX = e.pageX - self.pcStartX;
                                    if ( endTime - self.pcStartTime > 300) {
                                        if ( self.pcOffsetX >= boundary ) {
                                            // 上一页
                                            self.goLeftIndex(id-1);
                                        } else if ( self.pcOffsetX < 0 && self.pcOffsetX < -boundary ) {
                                            // 下一页

                                            self.goRightIndex((id+1));
                                        }
                                    } else {
                                        if ( self.pcOffsetX > 50 ) {
                                            self.goLeftIndex((id-1));
                                        } else if ( self.pcOffsetX < -50 ) {
                                            self.goRightIndex((id+1));
                                        }
                                    }

                                    $(self.mBigPic).off(".scroll");
                                });
                });


                return self;
            },
            // 向左
            goLeftIndex: function (n) {
                if ( n < 0 ) {
                    return false;
                } else {
                    this.loadImage(n, this.callbackRight);
                }

            },
            // 向右
            goRightIndex: function (n) {

                if ( n > this.length-1 ) {
                    return false;
                } else {
                    this.loadImage(n, this.callbackLeft);

                }
            },
            // 查看原图
            _openWinPic: function () {
                var self = this;

                $('.m-look-pic').on('click',function(){
                    var imgPicSrc = self.wrap.find('img').eq(self.cid).attr('src');
                    window.open(imgPicSrc,'_blank');
                });

                return self;
            },
            // 切换大图的动画回调函数
            callbackRight: function () {
                var self = this;
                self.bigPic = $('.big-pic');

                self.bigPic[0].addEventListener('webkitAnimationEnd',function (e){
                    self.bigPic.removeClass('animated bounceInLeft');
                    self.bigPic[0].removeEventListener('webkitAnimationEnd',false);
                },false);

                self.bigPic.addClass('animated bounceInLeft');
            },
            // 切换大图的动画回调函数
            callbackLeft: function () {
                var self = this;
                self.bigPic = $('.big-pic');

                self.bigPic[0].addEventListener('webkitAnimationEnd',function (e){
                    self.bigPic.removeClass('animated bounceInRight');
                    self.bigPic[0].removeEventListener('webkitAnimationEnd',false);
                },false);

                self.bigPic.addClass('animated bounceInRight');

            },
            // 最大化展示
            fullScreenBindEvent: function () {
                var self = this;
                var type = false;
                self.full = $(".p-screen");
                self.full.on('click',function (e) {
                    var index = self.active.html();
                    if ( !type ) {
                        self.changeStyle()
                            ._setAglinHeight();
                        self._setAglinListHeight();
                        
                        type = true;
                    } else {
                        self.restoreStyle();
                        self.setWrapHeight(self.picRatio);
                        self._setAglinListHeight();
                    
                        type = false;
                    }
                    self._getIndex();
                    self.wrap.scrollTop(arr[index-1]);
                    self._scrollEvent()
                        ._go()
                        ._prev()
                        ._next()
                        .getPolHeight();
                    self.wrap.trigger('scroll');
                    

                });
                return self;
            },
            // 改变样式
            changeStyle: function () {
                this.section.css({
                    'position':'fixed',
                    'top': '0',
                    'left':'0',
                    'width': '100%',
                    'height': '100%'
                });
                this.head.css({
                    width: '100%'
                });
                this.cont.css({
                    width: '100%'
                });
                this.full.attr('src',context+'/_js/_portletPlugs/pictureviewer/img/x_litter.png');
                return this;
            },
            restoreStyle: function () {
                this.section.css({
                    'position':'static',
                    'width': '100%',
                    'height': '100%'
                });
                this.head.css({
                    width: '100%'
                });
                this.cont.css({
                    width: '100%'
                });
                this.full.attr('src',context+'/_js/_portletPlugs/pictureviewer/img/x_big.png');
                return this;
            },
            // 重新计算高度
            _setAglinHeight: function () {
                this.cont.height(this.winHeight-30)
                return this;
            },
            _setAglinListHeight: function () {
                var self = this;
                for ( var i = 0; i < self.data.length; i++ ){
                    for ( var j = 0; j < self.list.length; j++ ) {
                        $(self.list[i]).height(self.getImgHeight(self.section.width(),self.data[i].width,self.data[i].height));
                    }
                }
            },
            _getIndex: function (){
                var self = this;
                var index = this.list.length;
                arr = [];
                var height = 0;
                for (var i = 0; i < index; i++) {
                    setTimeout(function  (a) {
                        for ( var j = 0; j < a; j++  ) {
                           height += $(self.list[j]).height();
                        }
                       arr.push(height);
                       height = 0;
                    }(i),0);
                }
                return arr;
            }

        };
        return PictureSwitch;
    })();
    $.fn.PictureSwitch = function (options) {
        return this.each(function () {
            var me = $(this),
                instance = me.data("PictureSwitch");
            if (!instance) {
                instance = new PictureSwitch(me, options);
                me.data("PictureSwitch", instance);
            }

            if ($.type(options) === "string") return instance[options]();
        })
    };

    $.fn.PictureSwitch.default = {
        data: $("[data-PictureSwitch]").data('data')
    };
    $("[data-PictureSwitch]").PictureSwitch();
    $(".wp_pdf_player").css("height","100%");
}

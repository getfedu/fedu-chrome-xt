'use strict';
/* global jQuery, moment */

jQuery(document).ready(function($) {

    var popup = {

        apiData: {},
        videoId: '',
        videoType: '',

        queryApi: function(id, type){
            var that = this;
            $.ajax({
                type: 'POST',
                url: 'http://localhost:3100/api-call',
                data: { id: id, type: type, key: 'AIzaSyB4b8cdEoaJ_rlaKcBU5A3bg012b4id1xU' }
            }).done(function(apiData){
                that.renderForm(apiData, id, type);
                that.apiData = apiData;
                $('#overlay').fadeOut();
            }).fail(function(jqXHR, textStatus){
                console.log(jqXHR, textStatus);
                if(jqXHR.status === 401){
                    $('#overlay').remove();
                    $('#add_post').remove();
                    $('#msg').html('Sorry, your not logged in. Please log in first to fedu-backend...');
                }
            });
        },

        renderForm: function(apiData, id, type){
            $('#add_post').find('input[name="videoId"]').val(id);
            $('#add_post').find('input[name="videoType"]').val(type);
            $('#add_post').find('input[name="title"]').val(apiData.title);
            $('#add_post').find('textarea[name="description"]').html(apiData.description);
        },

        addVideo: function(formData){
            var data = {
                videoId: formData[0].value,
                videoType: formData[1].value,
                title: formData[2].value,
                description: formData[3].value,
                foreign: this.apiData.foreign,
                tags: [''],
                additionalInfo: [''],
                updateDate: moment().format(),
                publishDate: moment().format()
            };

            $.ajax({
                type: 'POST',
                url: 'http://localhost:3100/post',
                data: data
            }).done(function(msg){
                $('#msg').html(msg);
            }).fail(function(jqXHR, textStatus){
                $('#msg').html(textStatus);
                console.log(jqXHR, textStatus);
            });
        },

        getIds: function(url){
            var theId = '';
            var type = '';

            // regex from: http://stackoverflow.com/questions/5830387/how-to-find-all-youtube-video-ids-in-a-string-using-a-regex/5831191#5831191
            var youtubeRegex = /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube\.com\S*[^\w\-\s])([\w\-]{11})(?=[^\w\-]|$)(?![?=&+%\w]*(?:['"][^<>]*>|<\/a>))[?=&+%\w-]*/ig;

            // regex from: http://stackoverflow.com/questions/13286785/match-vimeo-video-id/13286930#13286930
            var vimeoRegex = /https?:\/\/(?:www\.)?vimeo.com\/(?:channels\/|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;

            if(youtubeRegex.test(url)){
                $('#add_post').fadeIn();
                theId = url.replace(youtubeRegex, '$1');
                type = 'youtube';
            } else if(vimeoRegex.test(url)){
                $('#add_post').fadeIn();
                var match = url.match(vimeoRegex);
                theId = match[3];
                type = 'vimeo';
            } else {
                theId = false;
                $('#overlay').remove();
                $('#msg').html('Sorry, this is no supported Video site...');
            }

            this.videoId = theId;
            this.videoType = type;

            this.queryApi(theId, type);
        },

        eventListener: function(){
            var that = this;
            $('#add_post').on('submit', function(e){
                e.preventDefault();
                var formData = $(this).serializeArray();
                that.addVideo(formData);
            });

            $('#cancel').on('click', function(){
                window.close();
            });
        }
    };

    chrome.tabs.getSelected(null, function(tab) {
        popup.eventListener();
        popup.getIds(tab.url);
    });
});
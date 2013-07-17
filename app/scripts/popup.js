'use strict';
/* global jQuery, moment, _ */

jQuery(document).ready(function($) {

    var popup = {

        apiData: {},
        videoId: '',
        videoType: '',
        engine: {
            //Workaround for using underscore templating engine at typeahead
            compile: function(template) {
                var compiled = _.template(template);
                return {
                    render: function(context) {
                        return compiled(context);
                    }
                };
            }
        },

        init: function(){
            this.eventListener();
        },

        queryApi: function(id, type){
            var that = this;
            $.ajax({
                type: 'POST',
                url: 'https://getfedu.com/api/api-call',
                data: { id: id, type: type },
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
            var tagsList = formData[4];
            var tags = [''];
            if(tagsList.value !== ''){
                tags = tagsList.value.split(',');
                tags.pop();
            }

            var data = {
                videoId: formData[0].value,
                videoType: formData[1].value,
                title: formData[2].value,
                description: formData[3].value,
                foreign: this.apiData.foreign,
                tags: tags,
                additionalInfo: [''],
                updateDate: moment().format(),
                publishDate: moment().format()
            };

            $.ajax({
                type: 'POST',
                url: 'https://getfedu.com/api/post',
                data: data,
            }).done(function(msg){
                console.log(msg);
                $('#msg').html('Video added to fedu');
                $('#add_post').fadeOut();
                setTimeout(function() {
                    window.close();
                }, 3000);
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
                url.replace(youtubeRegex, '$1');
                var exec = youtubeRegex.exec(url); //second time matching, to ensure urls like: https://www.youtube.com/watch?v=kiUnJ1d8vvw&feature=youtu.be work
                theId = exec[1];
                type = 'youtube';
                this.checkVideoId(theId, type);
            } else if(vimeoRegex.test(url)){
                var match = url.match(vimeoRegex);
                theId = match[3];
                type = 'vimeo';
                this.checkVideoId(theId, type);
            } else {
                theId = false;
                $('#overlay').remove();
                $('#msg').html('Sorry, this is no supported Video site...');
            }

            this.videoId = theId;
            this.videoType = type;
        },

        checkVideoId: function(id, type){
            var that = this;
            console.log(id, type);
            $.ajax({
                type: 'GET',
                url: 'https://getfedu.com/api/post-exists/' + id,
            }).done(function(res){
                if(res){
                    $('#overlay').hide();
                    $('#msg').html('Sorry, this video is already in our database...');
                } else {
                    $('#add_post').fadeIn();
                    that.queryApi(id, type);
                }
            }).fail(function(jqXHR, textStatus){
                console.log(jqXHR, textStatus);
                if(jqXHR.status === 401){
                    $('#overlay').remove();
                    $('#add_post').remove();
                    $('#msg').html('Sorry, your not logged in. Please log in first to fedu-backend...');
                }
            });
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

            $('input.typeahead').on('keydown', function(e){
                that.autoCompleteKeyHandler(e);
            });

            $('input.typeahead').on('focus', function(e){
                if(!$(e.currentTarget).hasClass('tt-query')){
                    that.initAutoComplete();
                }
            });

            $('body').on('click', '.tag', function(e){
                console.log(e);
                that.removeTag($(e.currentTarget));
            });

            $('body').on('typeahead:autocompleted', function(e){
                that.addTag(e.target, e.target.value);
            });

            $('body').on('typeahead:selected', function(e){
                that.addTag(e.target, e.target.value);
            });
        },

        // Autocomplete Tags
        initAutoComplete: function(){
            var that = this;
            $('.typeahead').typeahead({
                name: 'autocomplete-tags',
                valueKey: 'tagName',
                prefetch: {
                    url: 'https://getfedu.com/api/tag',
                    ttl: 0
                },
                template: [
                    '<p class="repo-name"><%= tagName %></p>',
                    '<p class="repo-description"><%= description %></p>',
                ].join(''),
                engine: that.engine
            });
            $('.typeahead').focus();
        },

        autoCompleteKeyHandler: function(e){
            if(e.keyCode === 188 && e.currentTarget.value !== ''){
                e.preventDefault();
                this.addTag(e.currentTarget, e.currentTarget.value);
            } else if(e.keyCode === 8 && e.currentTarget.value === '') {
                e.preventDefault();
                this.removeTag($(e.currentTarget).parents('.tags').children('.tag').last(), 'backspace');
            }
        },

        addTag: function(target, value){
            var countTags = $(target).parents('.uneditable-input');
            countTags = $(countTags).find('.btn').length+1;
            if(countTags !== 6){
                var val = $(target).parent().siblings('[type=hidden]').val();
                $(target).parent().siblings('[type=hidden]').val(value.trim().toLowerCase() + ',' + val).addClass('changed');
                $(target).val('').parent().before('<div class="btn tag">' + value.toLowerCase() + '</div>');
                $(target).typeahead('destroy');
                $('.typeahead').focus();
            }

            if(countTags === 5){
                $(target).attr('placeholder', 'only 5 tags allowed');
                $(target).attr('disabled', 'disabled');
            }
        },

        removeTag: function(target, type){
            var countTags = $(target).parent('.uneditable-input');
            countTags = $(countTags).find('.btn').length;
            var value = target.text();
            var valueList = target.siblings('[type=hidden]').val();
            if(valueList){
                valueList = valueList.replace(value + ',', '');
            }
            target.siblings('[type=hidden]').val(valueList).addClass('changed');
            if(type){
                $('.typeahead').val(value);
            }

            if(countTags === 5){
                var inputField = $(target).siblings('.twitter-typeahead').find('.tt-query');
                inputField.attr('placeholder', 'enter some tags');
                inputField.removeAttr('disabled');
            }
            target.remove();
        },
    };

    chrome.tabs.getSelected(null, function(tab) {
        popup.init();
        popup.getIds(tab.url);
    });
});
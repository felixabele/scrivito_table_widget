(function($, App) {
  'use strict';

  var table_editor = {
    can_edit: function(element) {
      return $(element).is('.scrivito-table-editor');
    },
    activate: function(element) {
      var activeWidget = null;

      $(element).on('click', function(event) {

        if (!$(this).data('medium-editor-element')) {
          scrivito.editors.medium_editor.activate(element);
        }

        activeWidget = $(element).edit_table({
          update: function(_, data) {
            $(element).scrivito('save', data.html);
          }
        });

        event.stopPropagation();
      });

      $('body').on('click', function(event) {
        if(!$(event.target).parents('#table_editor_cell_menu').length && !$(event.target).parents('#table_editor_cell_styles').length) {

          if ((activeWidget != null) && (activeWidget.is(':scrivito-edit_table')))
            activeWidget.edit_table('destroy');
        }
      });
    }
  };

  scrivito.on('content', function() {
    return scrivito.define_editor('table_editor', table_editor);
  });

})(jQuery, this);

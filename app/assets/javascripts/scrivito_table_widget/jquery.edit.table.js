$(function() {
  'use strict';

  $.widget("scrivito.edit_table", {

    options: {
      class_name: 'scrivito-table-editor',
      presetContent: '',
      table_classes: {
        'table-striped': 'Striped',
        'table-condensed': 'Condensed',
        'table-hover': 'Hover',
        'table-bordered': 'Border',
        'column-first': 'First',
      },
      cell_actions: {
        cell_styles:    { title: "Styles", icon_class: "pencil" },
        add_row_below:  { title: "Add row below", icon_class: "plus-circle" },
        add_row_top:    { title: "Add Row on Top", icon_class: "plus-circle" },
        add_col_left:   { title: "Add Col Left", icon_class: "plus-circle" },
        add_col_right:  { title: "Add Col Right", icon_class: "plus-circle" },
        merge_left:     { title: "Merge Left", icon_class: "reply" },
        merge_right:    { title: "Merge Right", icon_class: "share" },
        delete_row:     { title: "Delete Row", icon_class: "minus-circle" },
        delete_column:  { title: "Delete Column", icon_class: "minus-circle" },
        split_column:   { title: "Split Column", icon_class: "ellipsis-h" },
      },
      cell_styles: [
        { title: "Align Left", icon_class: "align-left", css: {'text-align': 'left'} },
        { title: "Align Center", icon_class: "align-center", css: {'text-align': 'center'} },
        { title: "Align Right", icon_class: "align-right", css: {'text-align': 'right'} },
      ],
      cell_classes: [
        { title: "No Background", icon_class: "crosshairs", css_class: '' },
        { title: "Background class: success", icon_class: "crosshairs", css_class: 'alert-success' },
        { title: "Background class: info", icon_class: "crosshairs", css_class: 'alert-info' },
        { title: "Background class: warning", icon_class: "crosshairs", css_class: 'alert-warning' },
        { title: "Background class: danger", icon_class: "crosshairs", css_class: 'alert-danger' },
      ],
    },

    matrix: [],
    activeCell: null,
    $contextMenu: null,
    $tableMenu: null,
    $cellStyleMenu: null,
    cellStyles: [],
    keysBound: false,

    _activeColumn: function() {
      var table = this;
      return table.matrix.map(
        function(row) { return row[table.activeCell.col_index] }
      );
    },

    // Initialize
    _create: function() {
      var table = this;

      this.element.addClass(this.options.class_name);
      this.cellStyles = $.unique(this.options.cell_styles.map(function(a) {
        return Object.keys(a.css)[0]
      }));

      if (this.element.find('table').length) {
        this.parseHtml();
      } else {
        this.matrix = [[{ colspan: 1, rowspan: 1, content: '' }]];
      }

      this._createContextMenu();
      this._createTableMenu();
      this._createCellStyleMenu();

      this.renderHtml();
      this._reloadTableClasses();

      $(window).resize(function() {
        if (table.activeCell)
          table._attachMenuToCell(table.activeCell);
      });

      if(!this.keysBound) {
        this._bindKeys();
      }
    },

    _createCellStyleMenu: function() {
      var table = this;
      this.$cellStyleMenu = $('<div>').hide();
      this.$cellStyleMenu.attr('id', 'table_editor_cell_styles');
      this.element.append(this.$cellStyleMenu);

      var createBtn = function(icon, title) {
        var btn = $('<a>').addClass('btn btn-xs').attr('title', title);
        table.$cellStyleMenu.append(btn);
        return btn.append($('<i>').addClass('fa fa-'+ icon));
      }

      $.each(this.options.cell_styles, function(_, properties) {
        var $styleBtn = createBtn(properties.icon_class, properties.title);
        $styleBtn.on('click', function() {
          table.addCellStyle(table.activeCell, properties.css);
        });
      });

      $.each(this.options.cell_classes, function(_, properties) {
        var $styleBtn = createBtn(properties.icon_class, properties.title);
        $styleBtn.addClass(properties.css_class);
        $styleBtn.on('click', function() {
          table.addCellClass(table.activeCell, properties.css_class);
        });
      });
    },

    _createContextMenu: function() {
      var table = this;

      table.$contextMenu = $('<div>').attr('id', 'table_editor_cell_menu').hide();
      table.element.append(this.$contextMenu);

      $.each(this.options.cell_actions, function(action, opt) {
        var $btn = $('<a>')
          .addClass(action)
          .attr({ 'data-action': action, 'title': opt.title });

        $btn.append($('<i>').addClass('fa fa-'+ opt.icon_class));
        table.$contextMenu.append($btn);
      });
    },

    _createTableMenu: function() {
      var table = this,
          $editBtn = $('<a>')
            .addClass('btn btn-primary btn-xs table-editor-toggle-menu')
            .append($('<i>').addClass('fa fa-paint-brush')),
          $addBtnGroup = $('<div>').addClass('table-editor-btn-group').hide(),
          $addClassBtn = $('<a>').addClass('btn btn-xs').data('action', 'add_class');

      table.$tableMenu = $('<div>').attr('id', 'table_editor_table_menu').addClass('clearfix')
      table.$tableMenu.append($editBtn);
      table.$tableMenu.append($addBtnGroup);

      $editBtn.on('click', function(e) {
        e.preventDefault();
        $addBtnGroup.toggle();
      });

      $.each(table.options.table_classes, function(cssClass, label) {
        var $btnEl = $addClassBtn.clone().data('value', cssClass).html(label);
        $btnEl.on('click', function() {
          table.element.find('table').toggleClass(cssClass);
          table._reloadTableClasses();
          table._triggerUpdate();
        });
        $addBtnGroup.append($btnEl);
      });

      table.element.prepend(this.$tableMenu);
    },

    _reloadTableClasses: function() {
      var $table = this.element.find('table');
      this.$tableMenu.find('a').each(function() {
        if ($table.hasClass($(this).data('value')))
          $(this).removeClass('btn-default').addClass('btn-success');
        else
          $(this).removeClass('btn-success').addClass('btn-default');
      });
    },

    _attachMenuToCell: function(cell) {
      this.$contextMenu.css({
        width: cell.element.outerWidth(),
        height: cell.element.outerHeight(),
      });
      this.$contextMenu.position({
        my: "left top",
        at: "left top",
        of: cell.element
      });
    },

    _onCellActionClick: function(cell) {

      if (!cell.element.hasClass('highlight')) {
        this.activeCell = cell;
        this.element.find('td, th').removeClass('highlight');
        cell.element.addClass('highlight');

        this.$contextMenu.unbind('click');
        this._initClickHandler();
        this._initHighlightHandler();
        this.$contextMenu.show();
        this._attachMenuToCell(cell);
        this.$cellStyleMenu.hide();

        this.$contextMenu.find('a.merge_right').toggle(
          !this._isLastVisibleCell(cell.row_index, cell.col_index)
        );

        this.$contextMenu.find('a.merge_left').toggle(
          !this._isFirstVisibleCell(cell.row_index, cell.col_index)
        );
        this.$contextMenu.find('a.delete_row').toggle(this.rowCount() > 1);
        this.$contextMenu.find('a.delete_column').toggle((this.colCount() > 1) && this._canDeleteColumn());
        this.$contextMenu.find('a.split_column').toggle(cell.colspan > 1);
      }
    },

    _initClickHandler: function() {
      var table = this;
      var events = {
        cell_styles:    function() { table._showCellStyleMenu() },
        add_row_below:  function() { table.addBottomRow(table.activeCell.row_index) },
        add_row_top:    function() { table.addTopRow(table.activeCell.row_index) },
        add_col_left:   function() { table.addLeftCols(table.activeCell.col_index) },
        add_col_right:  function() { table.addRightCols(table.activeCell.col_index) },
        merge_right:    function() { table.mergeRight(table.activeCell.row_index, table.activeCell.col_index) },
        merge_left:     function() { table.mergeLeft(table.activeCell.row_index, table.activeCell.col_index) },
        delete_row:     function() { table.deleteRow(table.activeCell.row_index) },
        delete_column:  function() { table.deleteColumn(table.activeCell.col_index) },
        split_column:   function() { table.splitColumn(table.activeCell) },
      }

      this.$contextMenu.on('click', 'a', function(e) {
        e.preventDefault();
        var action = $(this).data('action');
        events[action]();

        if (action != 'cell_styles')
          table.renderHtml();
      });
    },

    _highlightColumn: function(cl) {
      $.each(this._activeColumn(), function() {
        if (this != undefined)
          this.element.addClass(cl);
      })
    },

    _showCellStyleMenu: function() {
      if (this.$cellStyleMenu.is(':visible')) {
        this.$cellStyleMenu.hide();
      } else {
        var posi = this.activeCell.element.position();
        this.$cellStyleMenu.css({ left: (posi.left+20) +'px', top: (posi.top-20) +'px' });
        this.$cellStyleMenu.show();
      }
    },

    _initHighlightHandler: function() {
      var table = this;

      var events = {
        cell_styles:    function() { },
        add_row_below:  function() { table.activeCell.row_element.addClass('highlight-bottom') },
        add_row_top:    function() { table.activeCell.row_element.addClass('highlight-top') },
        merge_right:    function() { table.activeCell.element.next().addClass('highlight-merge') },
        merge_left:     function() { table.activeCell.element.prev().addClass('highlight-merge') },
        delete_row:     function() { table.activeCell.row_element.addClass('highlight-delete') },
        add_col_left:   function() { table._highlightColumn('highlight-left') },
        add_col_right:  function() { table._highlightColumn('highlight-right') },
        delete_column:  function() { table._highlightColumn('highlight-delete') },
        split_column:   function() { },
      };

      this.$contextMenu.find('a')
        .mouseenter(function() {
          events[$(this).data('action')]();
        })
        .mouseleave(function() {
          table.element.find('tr').removeClass('highlight-bottom highlight-top highlight-merge highlight-delete');
          table.element.find('td, th').removeClass('highlight-left highlight-right highlight-merge highlight-delete');
        });
    },

    _isLastVisibleCell: function(row_index, col_index) {
      return this._getNextVisibleCell(row_index, col_index) == undefined;
    },

    _isFirstVisibleCell: function(row_index, col_index) {
      return this._getPreviousVisibleCell(row_index, col_index) == undefined;
    },

    _getNextVisibleCell: function(row_index, col_index) {
      if ((this.matrix[row_index].length-1) == col_index)
        return undefined;

      for (var i=(col_index+1); i<this.matrix[row_index].length; i++) {
        if (this.matrix[row_index][i].colspan > 0) {
          return this.matrix[row_index][i];
        }
      }
      return undefined;
    },

    _getPreviousVisibleCell: function(row_index, col_index) {
      if (col_index == 0) return undefined;

      for (var i=(col_index-1); i>=0; i--) {
        if (this.matrix[row_index][i].colspan > 0)
          return this.matrix[row_index][i];
      }
      return undefined;
    },

    // disable delete-column if cells in the column had been merged
    _canDeleteColumn: function() {
      return this._activeColumn().filter(function(cell) {
        return cell.colspan != 1
      }).length == 0
    },

    _bindKeys: function() {
      var table = this;
      $('body').keyup(function(e) {
        table._triggerUpdate();
      });
      this.keysBound = true;
    },

    _triggerUpdate: function() {
      this._trigger('update', null, { html: this.getCleanTableHtml() });
    },

    _deselectCell: function() {
      if (this.activeCell != null) {
        this.activeCell.element.removeClass('highlight');
        this.activeCell = null;
      }
    },

    _destroy: function() {
      this.matrix = [];
      this.element.find('td, th').unbind('click');
      this._deselectCell();
      this.$contextMenu.remove();
      this.$tableMenu.remove();
      this.$cellStyleMenu.remove();
    },

    getCleanTableHtml: function() {
      var $cleanData = this.element.clone();
      $cleanData.find('#table_editor_cell_menu').remove();
      $cleanData.find('#table_editor_table_menu').remove();
      $cleanData.find('#table_editor_cell_styles').remove();
      $cleanData.find('.highlight').removeClass('highlight');
      return $cleanData.html();
    },

    rowCount: function() {
      return this.matrix.length;
    },

    colCount: function() {
      return this.matrix[0].length;
    },

    maxCellCount: function() {
      return Math.max.apply(Math, this.matrix.map(function(row) { return row.length }));
    },

    addLeftCols: function(index) {
      this.addCols(index);
    },

    addRightCols: function(index) {
      this.addCols(index+1);
    },

    addCols: function(new_index) {
      var table = this;
      $.each(this.matrix, function(_, row) {
        if (new_index < 0) {
          new_index = 0;
        } else if (new_index > row.length) {
          new_index = row.length;
        }

        row.splice(new_index, 0, { colspan: 1, rowspan: 1, content: table.options.presetContent });
      });
    },

    deleteColumn: function(index) {
      $.each(this.matrix, function() {
        this.splice(index, 1);
      });
    },

    addTopRow: function(index) {
      this.addRow(index);
    },

    addBottomRow: function(index) {
      this.addRow(index+1);
    },

    addCellStyle: function(cell, style) {
      cell.style = $.extend({}, cell.style, style);
      this.renderHtml();
    },

    addCellClass: function(cell, cssClass) {
      cell.css_class = cssClass;
      this.renderHtml();
    },

    addRow: function(new_index) {
      var cellCount = this.maxCellCount(),
          table = this;

      if (new_index < 0) {
        new_index = 0;
      } else if (new_index > this.matrix.length) {
        new_index = this.matrix.length;
      }

      var cells = Array.apply(null, Array(cellCount)).map(function() {
        return { colspan: 1, rowspan: 1, content: table.options.presetContent };
      })
      this.matrix.splice(new_index, 0, cells);
    },

    deleteRow: function(index) {
      this.matrix.splice(index, 1);
    },

    mergeRight: function(cell_row_index, cell_col_index) {
      this.mergeCells(
        this.matrix[cell_row_index][cell_col_index],
        this._getNextVisibleCell(cell_row_index, cell_col_index)
      );
    },

    mergeLeft: function(cell_row_index, cell_col_index) {
      this.mergeCells(
        this.matrix[cell_row_index][cell_col_index],
        this._getPreviousVisibleCell(cell_row_index, cell_col_index)
      );
    },

    mergeCells: function(origin, target) {
      if (origin.content != target.content) {
        origin.content += ' '+ target.content;
        origin.element.html(origin.content);
      }
      target.content = '';
      target.element.html('');
      origin.colspan++;
      target.colspan--;
    },

    splitColumn: function(cell) {
      var row = this.matrix[cell.row_index];

      var restoreClosestCell = function(offset) {
        var neighbour = row[cell.col_index+offset];
        if ((neighbour != undefined) && neighbour.colspan == 0) {
          neighbour.colspan++;
          return true;
        } else {
          return false;
        }
      }

      // checks all neighboring cells if they had been merged
      var offset = 1;
        while (offset < row.length) {
          if (restoreClosestCell(offset) || restoreClosestCell(offset*(-1))) {
            cell.colspan--;
            break;
          } else {
            offset++;
          }
        }
    },

    parseHtml: function() {
      var table = this,
          $tableEl = this.element.find('table')

      table.matrix = [];

      $tableEl.find('tr').each(function() {
        var cells = [];

        $(this).find('th,td').each(function() {
          var $cell = $(this),
              cellData = {
                colspan: parseInt($cell.attr('colspan')) || 1,
                rowspan: parseInt($cell.attr('rowspan')) || 1,
                content: $cell.html(),
                style: {},
                css_class: $cell.attr('class'),
              };

          $.each(table.cellStyles, function(_, cssProp) {
            cellData.style[cssProp] = $cell.css(cssProp);
          });

          cells.push(cellData);

          // add invisible cells if the cells spans
          for (var i=1; i<cellData.colspan; i++) {
            cells.push({ colspan: 0, rowspan: 0, content: '', style: {}, css_class: '' });
          }
        });
        table.matrix.push(cells);
      });

      // remove empty lines
      table.matrix = table.matrix.filter(function(row) { return row.length > 0 });
    },

    renderHtml: function() {
      var $tableEl = null,
          table = this;

      this._deselectCell();

      if (this.element.find('table').length) {
        $tableEl = this.element.find('table');
        $tableEl.html('');
      } else {
        $tableEl = $('<table class="table">');
        this.element.append($tableEl);
      }

      $.each(this.matrix, function(row_index, row) {
        var $row_el = $('<tr>');

        $.each(row, function(col_index, cell) {

          if (cell.colspan > 0) {
            cell.row_index = row_index;
            cell.col_index = col_index;
            cell.row_element = $row_el;

            if (cell.element != undefined)
              cell.content = cell.element.html();

            cell.element = (row_index == 0) ? $('<th>') : $('<td>');
            cell.element.attr('colspan', cell.colspan);
            cell.element.attr('class', cell.css_class);

            if (cell.style != undefined)
              cell.element.css(cell.style);

            cell.element.html(cell.content);
            cell.element.on('click', function() {
              table._onCellActionClick(cell);
            });
            $row_el.append(cell.element);
          }
        });

        $tableEl.append($row_el);
      });

      this.$contextMenu.hide();
      this.$cellStyleMenu.hide();
      this._triggerUpdate();
    }
  });
});

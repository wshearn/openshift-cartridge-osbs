function scheduleRestore_ajaxCall(gear, date, uuid)
{
  var url="/restorebackup";
  var data = {
    gear: gear,
    date: date,
    uuid: uuid
  }

  var posting = $.post(url, data);

  posting.done(scheduleRestore_showSuccessBox);
  posting.fail(scheduleRestore_showFailureBox);
}

function scheduleRestore_showSuccessBox()
{
  $("#success-box").slideDown();
}

function scheduleRestore_showFailureBox()
{
  $("#failure-box").slideDown();
}

function page_loaded () {
  $("#success-box").click(function() {
      $( this ).slideUp();
  });
  $("#failure-box").click(function() {
      $( this ).slideUp();
  });
  $("#schedule_submit").click(function(event) {
      scheduleBackup_ajaxCall(event);
  });
}

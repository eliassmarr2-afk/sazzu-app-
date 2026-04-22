(function () {
    const PAGE_FILE = "publicidadinterna.html";
  
    function currentFile_() {
      return (location.pathname.split("/").pop() || "").toLowerCase();
    }
  
    function mount_() {
      if (currentFile_() !== PAGE_FILE) return;
      console.log("[publicidadinterna] montado");
    }
  
    document.addEventListener("DOMContentLoaded", mount_);
    document.addEventListener("sazzu:page:load", mount_);
  })();
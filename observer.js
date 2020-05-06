var event = new Event("change");
var target = document.querySelector('.info-strap time');

var mutationObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        document.dispatchEvent(event);
        console.log(target.innerText);
    });
});

console.log(target.innerText);

mutationObserver.observe(target, {
    attributes: false,
    characterData: true,
    childList: false,
    subtree: true,
    attributeOldValue: false,
    characterDataOldValue: false
});
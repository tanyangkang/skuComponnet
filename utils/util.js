util.showToast = (message,icon,duration) =>{
	uni.hideToast();
	uni.showToast({
		title:message,
		duration:duration || 2000,
		mask:true,
		icon:icon || 'none'
	})
}
export default util;
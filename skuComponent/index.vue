<template>
	<u-popup v-model="isShow" border-radius="20" closeable @close="handleClose" mode="bottom" :safe-area-inset-bottom="true">
		<view class="goods_sku_item">
			<view class="goods_main1">
				<view class="goods_image">
					<image mode="aspectFill" :src="emitInfo.picUrl ? emitInfo.picUrl : goodsDetail.picUrls[0]"></image>
				</view>

				<view class="goods_info">
					<view class="goods_price" v-if="goodsDetail.specType == '1'">¥<text>{{emitInfo.salesPrice ? emitInfo.salesPrice : goodsDetail.skus[0].salesPrice}}</text></view>
					<view class="goods_price" v-if="goodsDetail.specType == '0' && !isVip">¥<text>{{emitInfo.salesPrice ? emitInfo.salesPrice : goodsDetail.skus[0].salesPrice}}</text><text class="vip_price">会员价:¥{{goodsDetail.skus[0].memberPrice.toFixed(2)}}</text></view>
					<view class="goods_price" v-if="goodsDetail.specType == '0' && isVip"><span class="vip_price_name">会员价: ¥</span><span class="vip_pricess">{{goodsDetail.skus[0].memberPrice.toFixed(2)}}</span><text class="line_throught">¥{{goodsDetail.skus[0].salesPrice}}</text></view>
                    <view v-if="goodsDetail.specType == '1'"><text style="margin-right: 8rpx;">库存</text><span>{{emitInfo.stock ? emitInfo.stock : ''}}</span></view>
                    <view v-if="goodsDetail.specType == '0'"><text style="margin-right: 8rpx;">库存</text><span>{{goodsDetail.skus[0].stock ? goodsDetail.skus[0].stock : 0}}</span></view>
					<view class="goods_specs" v-if="goodsDetail.specType == '1'">
						<text>已选</text>
						<text v-for="(item,index) in selected"
							:key="index">{{(index == 0) && item ? item + ';' : item + ';' }}</text>
					</view>
				</view>
			</view>
            <scroll-view scroll-y="true" style="min-height: 400rpx;">
                <view class="specs_list">
                    <view v-for="(spec, index) in specList" class="specs_item" :key="index">
                        <view class="specs_title">{{spec.value}}</view>
                        <view class="specs_text">
                            <view v-for="(item, i) in spec.leaf" :key="i" :class="{'specs_text_select' : selected.includes(item.value)}"
                                @click="handleClick(spec, index, item, i, valueInLabel[item.value])">
                                <view>{{item.value}}</view>
                                <view class="out_stock" v-if="!unDisabled.includes(valueInLabel[item.value])">缺货</view>
                            </view>
                        </view>
                    </view>
                </view>
            </scroll-view>
            <view class="goods_count UpopSku">
                <text>数量</text>
                <u-number-box v-model="quantity" :max="emitInfo.stock ? emitInfo.stock : 100" :min="1" bgColor="#540D8D" color="#FFFFFF"></u-number-box>
            </view>
			<view class="goods_sku_confirm">
				<button @click="handleConfirmSelectSku">确认</button>
			</view>
		</view>
	</u-popup>
</template>

<script>
	// import api from '@/utils/api';
	import util from '../utils/util.js';
    import { getPrime, PathFinder,getWay, descartes } from '../utils/sku.js'
	const app = getApp();
	export default {
		props: {
			goodsDetail: {
                type: Object,
                default: () => {}
            },
			specList: {
				type: Array,
				default: () => ([])
			},
            origin: {
                type: String, // 1购物车，2立即购买
                default: ''
            },
            selectedInfo: {
                type: Array,
                default: () => ([])
            }
		},
		data() {
			return {
				isShow: true,
                quantity: 1,
				selected: [], // 已经选中的规格
                unDisabled: [], // 可选规格
                canUseSku: [], // 可用sku
                valueInLabel: {}, // 质数，规格枚举值
                // 预留sku工具包
                pathFinder: '', //初始化值
                types: [], // specList 扁平化
                type: [], // specList 未扁平化
                prime: [], // 质数
                way: [], //排序坐标
                sku: [], // 笛卡尔化
                emitInfo: {},
				isVip: false
			}
		},

		watch: {
		},
		methods: {
			handleClose() {
				this.isShow = false;
				this.$emit("close");
			},
            /* 选择规格*/
            handleClick(item, index, el, key, prime) {
                const { selected, valueInLabel, type:stateType } = this
                // 检查此次选择是否在已选内容中
                const sIndex = selected.indexOf(el.value);
                // 获取已经有的矩阵值
                const light = this.pathFinder.light;
                if (sIndex > -1) {
                    this.pathFinder.remove(prime);
                    selected.splice(sIndex, 1);
                } else if (light[index].includes(2)) {
                    // 如果同规格中，有选中，则先移除选中,
                    // 获取需要移除的同行规格
                    const removeType = stateType[index][light[index].indexOf(2)];
                    // 获取需要提出的同行规格质数
                    const removePrime = valueInLabel[removeType];
                    // 移除
                    this.pathFinder.remove(removePrime);
                    selected.splice(selected.indexOf(removeType), 1)
                    //移除同行后，添加当前选择规格
                    this.pathFinder.add(prime);
                    selected.push(el.value);
                } else {
                    this.pathFinder.add(prime);
                    selected.push(el.value);
                }
                // 更新不可选规格
                this.unDisabled = this.pathFinder.getWay().flat();
                // 找到该规格对应的数据
                this.sku.forEach((item, index) => {
                    if (this.isArrayEqual(item.skuName, selected)) {
                        this.emitInfo = item
                    }
                })
            },
            handleConfirmSelectSku() {
                const { selected } = this;
                if (selected.length !== this.pathFinder.light.length && this.goodsDetail.specType == '1') {
                    util.showToast('请选择完整的规格', 'none', 1000)
                    return
                }
                if ((this.goodsDetail.specType == '0' && (this.goodsDetail.skus[0].stock <=0)) || (this.goodsDetail.specType == '1' && this.emitInfo.stock <= 0)) {
                    util.showToast('抱歉,该商品已暂无库存', 'none', 1000)
                    return
                }if ((this.goodsDetail.specType == '0' && (this.goodsDetail.skus[0].stock < this.quantity)) || (this.goodsDetail.specType == '1' && this.emitInfo.stock < this.quantity)) {
                    util.showToast('库存不足以支撑小主加购的数量哦', 'none', 1000)
                    return
                }
                this.$nextTick(() => {
                    this.emitInfo.quantity = this.quantity;
                    this.$emit('submitSpec', this.emitInfo);
                })
                let submitInfo = {};
                if (this.goodsDetail.specType == '1') {
                    submitInfo = {
                        skuId: this.emitInfo.id,
                        addPrice: this.emitInfo.salesPrice,
                        salesPrice: this.emitInfo.salesPrice,
                        picUrl: this.emitInfo.picUrl,
                        quantity: this.quantity,
                        specInfo: this.emitInfo.skuName? this.emitInfo.skuName.join(';') : '',
                        spuId: this.emitInfo.spuId,
                        spuName: this.goodsDetail.name
                    }
                } else {
                    submitInfo = {
                        skuId: this.goodsDetail.skus[0].id,
                        // 会员价
                        addPrice: app.globalData.mallUserInfo.userGrade == -1 ? this.goodsDetail.skus[0].memberPrice : this.goodsDetail.skus[0].salesPrice,
                        salesPrice: app.globalData.mallUserInfo.userGrade == -1 ? this.goodsDetail.skus[0].memberPrice : this.goodsDetail.skus[0].salesPrice,
                        picUrl: this.goodsDetail.skus[0].picUrl ? this.goodsDetail.skus[0].picUrl : this.goodsDetail.picUrls[0],
                        quantity: this.quantity,
                        specInfo: '',
                        spuId: this.goodsDetail.skus[0].spuId,
                        spuName: this.goodsDetail.name
                    }
                }
                if (this.origin == '2') {
                    uni.removeStorageSync('orderInfo');
                    uni.setStorageSync('orderInfo', Array.from([submitInfo]));
                    this.$emit('close')
                    uni.navigateTo({
                        url: '/pages/shoppingCart/submitOrder/index'
                    })
                } else {
                    this.$emit('close')
                    api.addCart(submitInfo).then(res => {
                        if (res.code == 0) {
                            util.showToast('加购成功!', 'none', 1000)
                            this.$emit('close')
                        } else {
                            util.showToast(res.msg)
                        }
                    }).catch(err => {})
                }
            },
            isArrayEqual(arr1, arr2) {
                return arr1.length == arr2.length && arr1.every((ele) => arr2.includes(ele));
            },
            dealSpecList(list) { //specList 扁平化
                let arr = [];
                list.forEach(item => {
                    item.leaf.forEach(el => {
                        arr.push(el.value)
                    })
                })
                return arr
            },
            uniTree(tree) {
                const result = [];
                tree.forEach((item, index)=> {
                    result.push([])
                    item.leaf.forEach(el => {
                        result[index].push(el.value)
                    })
                })
                return result
            }
		},
		mounted() {
			this.isVip = app.globalData.mallUserInfo.userGrade == -1 ? true : false
            this.isShow = true;
            this.types = this.dealSpecList(this.specList);  //扁平化数组，取出所有规格值
            this.type = this.uniTree(this.specList)
            this.prime = getPrime(this.types.length); // 对应质数
            this.types.forEach((item, index) => {
                this.valueInLabel[item] = this.prime[index]; // 质数和规格值对应的数组，枚举处理
            });
            this.way = this.specList.map((i) => { // 根据规格坐标，排序质数坐标
                return i.leaf.map(ii => this.valueInLabel[ii.value])
            })
            this.sku = this.goodsDetail.skus.map((item) => {
                let arr1 = []
                item.specs.forEach(el => {
                    arr1.push(el.specValueName)
                })
                return {
                    skuPrime: arr1.map(ii => this.valueInLabel[ii]),
                    skuName: arr1,...item
                }
            })
            this.canUseSku = this.sku.filter(item => item.stock); //有库存的规格
            // 初始化规格展示内容
            this.pathFinder = new PathFinder(this.way, this.canUseSku.map(item =>item.skuPrime));
            // 获取不可选的规格,未回显时 默认都可选
            this.unDisabled = this.pathFinder.getWay().flat()
            // 已选规格后 回显处理
            if (this.selectedInfo && this.selectedInfo.length) {
				console.log(this.selectedInfo)
                this.selectedInfo.forEach(el => {
                    this.selected.push(el);
                    this.pathFinder.add(this.valueInLabel[el]);
                })
                this.unDisabled = this.pathFinder.getWay().flat();
                this.sku.forEach((item, index) => {
                    if (this.isArrayEqual(item.skuName, this.selected)) {
                        this.emitInfo = item
                    }
                })
            }
        }
	}
</script>

<style>
	@import url("./index.css");
</style>
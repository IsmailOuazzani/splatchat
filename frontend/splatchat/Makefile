expogo:
	npx expo start --host lan

build-android:
	@echo "Building Android APK"
	rm -rf android/
	rm -f **.aab
	CI=1 npx expo prebuild --clean --platform android 
	mkdir android/app/src/main/assets/
	cp assets/splat.html android/app/src/main/assets/
	CI=1 EAS_NO_VCS=1 eas build --platform android --local
	rm -f apps.apks
	java -jar bundletool-all-1.15.6.jar build-apks --output=./apps.apks --ks @liamsi02__ctwb_proj-keystore.bak.jks --ks-key-alias d7994bc51fc9490508a44bbd08a2895f --ks-pass pass:ca78d3909726c5b689567c518a34886c --key-pass pass:ec398d628cb826c148d273dad1496925 --mode universal --bundle=`ls *.aab | head -n 1`
	unzip apps.apks
	@echo "APKs built successfully"
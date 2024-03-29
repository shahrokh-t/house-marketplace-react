import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

function CreateListing() {
    const [geoLocationEnabled, setGeoLocationEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: "rent",
        name: "",
        bedrooms: 1,
        bathrooms: 1,
        parking: false,
        furnished: false,
        address: "",
        offer: false,
        regularPrice: 0,
        discountedPrice: 0,
        images: {},
        latitude: 0,
        longitude: 0
    })

    const { type, name, bedrooms, bathrooms, parking, furnished, address, offer, regularPrice, discountedPrice, images, latitude, longitude } = formData;

    const auth = getAuth();
    const navigate = useNavigate();
    const isMounted = useRef(true);

    useEffect(() => {
        if (isMounted) {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setFormData({ ...formData, userRef: user.uid })
                } else {
                    navigate("sign-in")
                }
            })
        }
        return () => {
            isMounted.current = false
        }
    }, [isMounted])

    const onSubmit = async (e) => {
        e.preventDefault();

        setLoading(true)

        if (discountedPrice >= regularPrice) {
            setLoading(false);
            toast.error("Discounted price needs to be less than regular price");
            return;
        }

        if (images.length > 6) {
            setLoading(false);
            toast.error("Max 6 images");
            return;
        }

        let geolocation = {};
        let location;

        if (geoLocationEnabled) {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.REACT_APP_GEOCODE_API_KEY}`)

            const data = await response.json();

            geolocation.lat = data.results[0]?.geometry.location.lat ?? 0;
            geolocation.lng = data.results[0]?.geometry.location.lng ?? 0;
            location = data.status === "ZERO_RESULTS" ? undefined : data.results[0]?.formatted_address

            if (location === undefined || location.includes("undefined")) {
                setLoading(false);
                toast.error("Please enter a correct address");
                return;
            }
        } else {
            geolocation.lat = latitude;
            geolocation.lng = longitude;
        }

        // Store image in firebase
        // https://firebase.google.com/docs/storage/web/upload-files#web-version-9_7
        const storeImage = async (image) => {
            return new Promise((resolve, reject) => {
                const storage = getStorage();
                const fileName = `${auth.currentUser.uid}-${image.name}-${uuidv4()}`;

                const storageRef = ref(storage, "images/" + fileName)

                // Upload file and metadata to the object 'images/mountains.jpg'
                const uploadTask = uploadBytesResumable(storageRef, image);

                // Listen for state changes, errors, and completion of the upload.
                uploadTask.on('state_changed',
                    (snapshot) => {
                        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Upload is ' + progress + '% done');
                        switch (snapshot.state) {
                            case 'paused':
                                console.log('Upload is paused');
                                break;
                            case 'running':
                                console.log('Upload is running');
                                break;
                            default:
                                break;
                        }
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        // Upload completed successfully, now we can get the download URL
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            resolve(downloadURL);
                        });
                    }
                );

            })
        }

        const imgUrls = await Promise.all(
            [...images].map((image) => storeImage(image))
        ).catch(() => {
            setLoading(false);
            toast.error("Images not uploaded");
            return;
        })

        const formDataCopy = {
            ...formData,
            imgUrls,
            geolocation,
            timestamp: serverTimestamp()
        }

        formDataCopy.location = address;
        delete formDataCopy.images;
        delete formDataCopy.address;
        !formDataCopy.offer && delete formDataCopy.discountedPrice;

        const docRef = await addDoc(collection(db, "listings"), formDataCopy)
        setLoading(false);
        toast.success("Listing saved");
        navigate(`/category/${formDataCopy.type}/${docRef.id}`);
    }

    const onMutate = (e) => {
        let boolean = null;

        if (e.target.value === 'true') {
            boolean = true;
        }
        if (e.target.value === 'false') {
            boolean = false;
        }

        // Files
        if (e.target.files) {
            setFormData((prevState) => ({
                ...prevState,
                images: e.target.files
            }));
        }

        // Text/Booleans/Numbers
        if (!e.target.files) {
            setFormData((prevState) => ({
                ...prevState,
                [e.target.id]: boolean ?? e.target.value
            }));
        }
    }

    if (loading) {
        return <Spinner />
    }
    return (
        <div className="profile">
            <header>
                <p className="pageHeader">Create a listing</p>
            </header>

            <main>
                <form onSubmit={onSubmit}>

                    <label className="formLabel" htmlFor="type">Sell / Rent</label>
                    <div className="formButtons div">
                        <button
                            type="button"
                            className={type === "sale" ? "formButtonActive" : "formButton"}
                            id="type"
                            value="sale"
                            onClick={onMutate}
                        >
                            Sell
                        </button>
                        <button
                            type="button"
                            className={type === "rent" ? "formButtonActive" : "formButton"}
                            id="type"
                            value="rent"
                            onClick={onMutate}
                        >
                            rent
                        </button>
                    </div>

                    <label className="formLabel" htmlFor="name">Name</label>
                    <input
                        className="formInputName"
                        type="text"
                        id="name"
                        value={name}
                        onChange={onMutate}
                        maxLength="32"
                        minLength="10"
                        required
                    />

                    <div className="formRooms">
                        <div>
                            <label className="formLabel" htmlFor="bedrooms">Bedrooms</label>
                            <input
                                className="formInputSmall"
                                type="number"
                                id="bedrooms"
                                value={bedrooms}
                                onChange={onMutate}
                                min="1"
                                max="50"
                                required
                            />
                        </div>
                        <div>
                            <label className="formLabel" htmlFor="bathrooms">Bathrooms</label>
                            <input
                                className="formInputSmall"
                                type="number"
                                id="bathrooms"
                                value={bathrooms}
                                onChange={onMutate}
                                min="1"
                                max="50"
                                required
                            />
                        </div>
                    </div>

                    <label className="formLabel" htmlFor="parking">Parking Spot</label>
                    <div className="formButtons">
                        <button
                            className={parking ? "formButtonActive" : "formButton"}
                            type="button"
                            id="parking"
                            value={true}
                            onClick={onMutate}
                            min="1"
                            max="50"
                        >
                            Yes
                        </button>
                        <button
                            className={!parking && parking !== null ? "formButtonActive" : "formButton"}
                            type="button"
                            id="parking"
                            value={false}
                            onClick={onMutate}
                            min="1"
                            max="50"
                        >
                            No
                        </button>
                    </div>

                    <label className="formLabel" htmlFor="furnished">Furnished</label>
                    <div className="formButtons">
                        <button
                            className={furnished ? "formButtonActive" : "formButton"}
                            type="button"
                            id="furnished"
                            value={true}
                            onClick={onMutate}
                        >
                            Yes
                        </button>
                        <button
                            className={!furnished && furnished !== null ? "formButtonActive" : "formButton"}
                            type="button"
                            id="furnished"
                            value={false}
                            onClick={onMutate}
                        >
                            No
                        </button>
                    </div>

                    <label className="formLabel" htmlFor="address">Address</label>
                    <textarea
                        className="formInputAddress"
                        type="text"
                        id="address"
                        value={address}
                        onChange={onMutate}
                        required
                    />

                    {!geoLocationEnabled && (
                        <div className="formLatLng">
                            <div>
                                <label htmlFor="latitude" className="formLabel">Latitude</label>
                                <input
                                    className="formInputSmall"
                                    type="number"
                                    id="latitude"
                                    value={latitude}
                                    onChange={onMutate}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="longitude" className="formLabel">Longitude</label>
                                <input
                                    className="formInputSmall"
                                    type="number"
                                    id="longitude"
                                    value={longitude}
                                    onChange={onMutate}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <label htmlFor="offer" className="formLabel">Offer</label>
                    <div className="formButtons">
                        <button
                            className={offer ? "formButtonActive" : "formButton"}
                            type="button"
                            id="offer"
                            value={true}
                            onClick={onMutate}
                        >
                            Yes
                        </button>
                        <button
                            className={!offer && offer !== null ? "formButtonActive" : "formButton"}
                            type="button"
                            id="offer"
                            value={false}
                            onClick={onMutate}
                        >
                            No
                        </button>
                    </div>

                    <label htmlFor="regularPrice" className="formLabel"> Regular Price</label>
                    <div className="formPriceDiv">
                        <input
                            className="formInputSmall"
                            type="number"
                            id="regularPrice"
                            value={regularPrice}
                            onChange={onMutate}
                            min="50"
                            max="750000000"
                            required
                        />
                        {type === "rent" && (
                            <p className="formPriceText"> $ / Month</p>
                        )}
                    </div>

                    {offer && (
                        <div>
                            <label htmlFor="discountedPrice" className="formLabel">Discounted Price</label>
                            <input
                                className="formInputSmall"
                                type="number"
                                id="discountedPrice"
                                value={discountedPrice}
                                onChange={onMutate}
                                min="50"
                                max="750000000"
                                required={offer}
                            />
                        </div>
                    )}

                    <label htmlFor="images" className="formLabel">Images</label>
                    <p className="imagesInfo">The first image will be the cover (max 6).</p>
                    <input
                        className="formInputFile"
                        type="file"
                        id="images"
                        onChange={onMutate}
                        max="6"
                        accept=".jpg,.png,.jpeg"
                        multiple
                        required
                    />
                    <button
                        className="primaryButton createListingButton"
                        type="submit">
                        Create Listing
                    </button>

                </form>
            </main>
        </div>
    )
}

export default CreateListing;